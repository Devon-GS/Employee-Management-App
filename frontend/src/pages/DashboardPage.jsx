import Navbar from "../components/Navbar";

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <Navbar title="Dashboard" />
      <section className="dashboard-empty" />
    </main>
  );
}
