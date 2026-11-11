import base64
import logging
from datetime import datetime, timezone
from typing import Any
import httpx
from pydantic import ValidationError

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


def _get_client(**kwargs) -> httpx.Client:
    return httpx.Client(timeout=TIMEOUT, follow_redirects=True, **kwargs)


def _normalize_site_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    url = url.rstrip("/")
    for suffix in ("/wp-admin", "/wp-login.php", "/wp-content/maintenance.php", "/wp-admin/index.php"):
        if url.endswith(suffix):
            url = url[: -len(suffix)].rstrip("/")
    return url


def _build_auth_header(username: str, app_password: str) -> dict[str, str]:
    # WordPress application passwords may contain spaces for readability - strip them for basic auth
    clean_pw = app_password.replace(" ", "").strip()
    token = base64.b64encode(f"{username.strip()}:{clean_pw}".encode("utf-8")).decode("utf-8")
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
            except Exception as e:
                logger.warning(f"Could not fetch site name from /wp-json: {e}")

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
                        content=content_text.strip(),
                        excerpt=excerpt_text.strip()[:200],
                        date_modified=str(post.get("modified") or post.get("date") or ""),
                        status=str(post.get("status") or "draft"),
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

    audit_ref = f"BG-{req.audit_id[:8]}" if req.audit_id else f"BG-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    score_str = f"{req.audit_score}/100" if req.audit_score is not None else "Compliant"

    # Append audit reference metadata and small disclosure footnote
    audit_comment = (
        f"\n\n<!-- BrandGuard AI Compliance Audit Reference -->\n"
        f"<!-- Reference: {audit_ref} | Score: {score_str} | Audited At: {timestamp} -->\n"
        f'<p><small><em>🛡️ Audited with BrandGuard AI — Reference: <strong>{audit_ref}</strong> (Score: {score_str})</em></small></p>'
    )
    final_content = req.content.rstrip() + audit_comment

    payload: dict[str, Any] = {
        "content": final_content,
        "status": req.status or "draft",
    }
    if req.title:
        payload["title"] = req.title

    try:
        with _get_client() as client:
            url = f"{site_url}/wp-json/wp/v2/posts/{req.post_id}"
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
            )
    except httpx.RequestError as exc:
        logger.error(f"Network error updating WordPress post {req.post_id} at {site_url}: {exc}")
        raise ValueError(f"Failed to sync revised draft to {site_url}: {exc}") from exc

