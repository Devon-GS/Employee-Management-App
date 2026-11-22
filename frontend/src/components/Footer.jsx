export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-content">
        <p className="app-footer-primary">
          <a
            href="https://devon-gs.github.io/"
            className="app-footer-link"
            title="coded by"
            target="_blank"
            rel="noopener"
          >
            Coded by Devon - Redfire IT Solutions © <span>{new Date().getFullYear()}</span>
          </a>
        </p>
        <p className="app-footer-secondary">
          <a
            href="https://www.flaticon.com/free-icons/employment"
            className="app-footer-link app-footer-attribution"
            title="employment icons"
            target="_blank"
            rel="noopener"
          >
            Icons created by pojok d - Flaticon
          </a>
        </p>
      </div>
    </footer>
  );
}
