import { ShieldCheck } from 'lucide-react';
import type { VoidHandler } from '../types';
interface FooterProps { onOpenWhitepaper: VoidHandler; onOpenDocs: VoidHandler; onOpenStatus: VoidHandler }
export default function Footer({ onOpenWhitepaper, onOpenDocs, onOpenStatus }: FooterProps) {
  return <footer className="site-footer"><div className="page-container"><div className="footer-main">
    <div><span className="footer-wordmark"><ShieldCheck size={26} strokeWidth={1.5} aria-hidden="true" />BrandGuard</span><p className="footer-tagline">More creativity. Less second-guessing.</p></div>
    <div className="footer-links"><button onClick={onOpenWhitepaper}>Audit reports</button><button onClick={onOpenDocs}>Brand rules</button><button onClick={onOpenStatus}>Hackathon edition</button></div>
  </div><p className="photo-credit">Landscape photograph by <a href="https://unsplash.com/photos/a-foggy-forest-with-a-sunset-in-the-background-oY8IrtfeYgQ" target="_blank" rel="noreferrer">Luca Bravo</a>, Unsplash.</p></div></footer>;
}
