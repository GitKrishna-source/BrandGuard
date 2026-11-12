import base64
import logging
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit

import httpx

from .schemas import (
    WordPressConnectRequest,
    WordPressConnectResponse,
    WordPressDraft,
    WordPressDraftsResponse,
    WordPressSyncRequest,
    WordPressSyncResponse,
)

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(20.0, connect=10.0)
AUDIT_MARKER = "<!-- BrandGuard AI Compliance Audit Reference -->"
AUDIT_NOTE = re.compile(
    rf"(?:\r?\n){{0,2}}{re.escape(AUDIT_MARKER)}\r?\n<!-- Reference: [^\r\n]* -->"
    r"(?:\r?\n<p><small><em>🛡️ Audited with BrandGuard AI [^\r\n]*</em></small></p>)?"
)


class WordPressDraftConflict(ValueError):
    pass


def _get_client(**kwargs) -> httpx.Client:
    return httpx.Client(timeout=TIMEOUT, **kwargs)


def _normalize_site_url(url: str) -> str:
    url = url.strip()
    if "://" not in url:
        url = f"https://{url}"
    url = url.rstrip("/")
    for suffix in ("/wp-admin", "/wp-login.php", "/wp-content/maintenance.php", "/wp-admin/index.php"):
        if url.endswith(suffix):
            url = url[: -len(suffix)].rstrip("/")
    parsed = urlsplit(url)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("Enter the canonical HTTPS URL for your WordPress site.")
    return url


def _modified(post: dict[str, Any]) -> str:
    return str(post.get("modified") or post.get("date") or "")


def _build_auth_header(username: str, app_password: str) -> dict[str, str]:
    # WordPress application passwords may contain spaces for readability - strip them for basic auth
    clean_pw = app_password.replace(" ", "").strip()
    token = base64.b64encode(f"{username.strip()}:{clean_pw}".encode()).decode()
    return {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def verify_wordpress_connection(req: WordPressConnectRequest) -> WordPressConnectResponse:
    site_url = _normalize_site_url(req.site_url)
    headers = _build_auth_header(req.username, req.app_password)

    try:
        with _get_client() as client:
            # 1. Get site title from root /wp-json
            site_name = None
            try:
                root_res = client.get(f"{site_url}/wp-json")
                if root_res.status_code == 200:
                    site_name = root_res.json().get("name")
            except (httpx.RequestError, ValueError, AttributeError) as error:
                logger.warning("Could not fetch site name from /wp-json: %s", error)

            # 2. Authenticate user via /wp-json/wp/v2/users/me
            user_res = client.get(f"{site_url}/wp-json/wp/v2/users/me", headers=headers)
            if user_res.status_code == 401:
                return WordPressConnectResponse(
                    success=False,
                    site_url=site_url,
                    username=req.username,
                    site_name=site_name,
                    user_display_name=None,
                )
            if user_res.status_code != 200:
                logger.warning(f"WordPress user check returned {user_res.status_code}: {user_res.text}")
                return WordPressConnectResponse(
                    success=False,
                    site_url=site_url,
                    username=req.username,
                    site_name=site_name,
                    user_display_name=None,
                )

            user_data = user_res.json()
            display_name = user_data.get("name") or user_data.get("slug") or req.username

            return WordPressConnectResponse(
                success=True,
                site_url=site_url,
                username=req.username,
                site_name=site_name or site_url,
                user_display_name=display_name,
            )
    except httpx.RequestError as exc:
        logger.error(f"Network error connecting to WordPress site {site_url}: {exc}")
        raise ValueError(f"Could not connect to WordPress site at {site_url}: {exc}") from exc


def fetch_wordpress_drafts(req: WordPressConnectRequest, per_page: int = 20) -> WordPressDraftsResponse:
    site_url = _normalize_site_url(req.site_url)
    headers = _build_auth_header(req.username, req.app_password)

    try:
        with _get_client() as client:
            # context=edit returns raw unescaped content if the user has edit permissions
            url = f"{site_url}/wp-json/wp/v2/posts"
            params = {
                "status": "draft",
                "per_page": min(per_page, 50),
                "context": "edit",
            }
            res = client.get(url, headers=headers, params=params)

            # If context=edit fails (e.g. restrictive permissions), retry with default view context
            if res.status_code in (401, 403) and params.get("context") == "edit":
                params.pop("context", None)
                res = client.get(url, headers=headers, params=params)

            if res.status_code != 200:
                raise ValueError(
                    f"WordPress returned HTTP {res.status_code}: {res.text[:200]}"
                )

            posts_data = res.json()
            drafts: list[WordPressDraft] = []

            for post in posts_data:
                if post.get("status") != "draft":
                    continue
                # Title
                raw_title = post.get("title")
                title_text = ""
                if isinstance(raw_title, dict):
                    title_text = raw_title.get("raw") or raw_title.get("rendered") or "Untitled Draft"
                elif isinstance(raw_title, str):
                    title_text = raw_title
                else:
                    title_text = "Untitled Draft"

                # Content (prefer raw, fallback to rendered)
                raw_content = post.get("content")
                content_text = ""
                if isinstance(raw_content, dict):
                    content_text = raw_content.get("raw") or raw_content.get("rendered") or ""
                elif isinstance(raw_content, str):
                    content_text = raw_content

                # Excerpt
                raw_excerpt = post.get("excerpt")
                excerpt_text = ""
                if isinstance(raw_excerpt, dict):
                    excerpt_text = raw_excerpt.get("raw") or raw_excerpt.get("rendered") or ""
                elif isinstance(raw_excerpt, str):
                    excerpt_text = raw_excerpt

                drafts.append(
                    WordPressDraft(
                        id=int(post["id"]),
                        title=title_text.strip(),
                        content=AUDIT_NOTE.sub("", content_text).strip(),
                        excerpt=excerpt_text.strip()[:200],
                        date_modified=_modified(post),
                        link=post.get("link"),
                    )
                )

            return WordPressDraftsResponse(drafts=drafts)
    except httpx.RequestError as exc:
        logger.error(f"Network error fetching WordPress drafts from {site_url}: {exc}")
        raise ValueError(f"Failed to fetch drafts from {site_url}: {exc}") from exc


def sync_draft_to_wordpress(req: WordPressSyncRequest) -> WordPressSyncResponse:
    site_url = _normalize_site_url(req.site_url)
    headers = _build_auth_header(req.username, req.app_password)

    now = datetime.now(UTC)
    audit_id = re.sub(r"[^A-Za-z0-9-]", "", (req.audit_id or "")[:8])
    audit_id = re.sub(r"-+", "-", audit_id).strip("-")
    audit_ref = f"BG-{audit_id or now.strftime('%Y%m%d%H%M')}"
    timestamp = now.strftime("%Y-%m-%d %H:%M UTC")
    score_str = f"{req.audit_score}/100" if req.audit_score is not None else "Unavailable"

    audit_comment = (
        f"\n\n{AUDIT_MARKER}\n"
        f"<!-- Reference: {audit_ref} | Score: {score_str} | Synced At: {timestamp} -->"
    )
    final_content = AUDIT_NOTE.sub("", req.content).rstrip() + audit_comment

    payload = {
        "content": final_content,
        "status": "draft",
    }
    if req.title:
        payload["title"] = req.title

    try:
        with _get_client() as client:
            url = f"{site_url}/wp-json/wp/v2/posts/{req.post_id}"
            current = client.get(url, headers=headers, params={"context": "edit"})
            if current.status_code != 200:
                raise ValueError(f"Could not verify WordPress draft (HTTP {current.status_code}).")
            post = current.json()
            if post.get("status") != "draft":
                raise WordPressDraftConflict("This WordPress post is no longer a draft. Import another draft.")
            if req.expected_modified and _modified(post) != req.expected_modified:
                raise WordPressDraftConflict("This draft changed in WordPress. Save your edits separately and reimport the latest draft.")

            res = client.post(url, headers=headers, json=payload)

            if res.status_code not in (200, 201):
                raise ValueError(
                    f"WordPress update failed with HTTP {res.status_code}: {res.text[:200]}"
                )

            post_data = res.json()
            updated_title = ""
            if isinstance(post_data.get("title"), dict):
                updated_title = post_data["title"].get("rendered") or post_data["title"].get("raw") or ""
            else:
                updated_title = str(post_data.get("title") or req.title or f"Post #{req.post_id}")

            return WordPressSyncResponse(
                success=True,
                post_id=int(post_data.get("id") or req.post_id),
                title=updated_title,
                status=str(post_data.get("status") or req.status),
                audit_reference=audit_ref,
                link=post_data.get("link"),
                message=f"Draft successfully updated in WordPress with audit reference {audit_ref}.",
                date_modified=_modified(post_data) or None,
            )
    except httpx.RequestError as exc:
        logger.error(f"Network error updating WordPress post {req.post_id} at {site_url}: {exc}")
        raise ValueError(f"Failed to sync revised draft to {site_url}: {exc}") from exc

