export default function Layout({ children }) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)" }}>
        {children}
      </div>
    );
  }