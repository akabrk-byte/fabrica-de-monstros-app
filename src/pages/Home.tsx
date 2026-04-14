import { useNavigate } from 'react-router-dom'
import './Home.css'

const features = [
  {
    id: 'timeline',
    title: 'Timeline dinâmica',
    description:
      'Visualize todas as tarefas organizadas por data relativa à inauguração, agrupadas por marco.',
  },
  {
    id: 'tasks',
    title: 'Marcos e tarefas',
    description:
      'Checklists por fase com responsáveis, status e dependências entre tarefas definidos.',
  },
  {
    id: 'replan',
    title: 'Replanejamento automático',
    description:
      'Mude a data de inauguração e todas as tarefas pendentes se ajustam automaticamente.',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <main className="hero">
        <span className="hero-badge">Sistema de Implantação</span>

        <h1 className="hero-title">Implantação Timeline</h1>

        <p className="hero-subtitle">
          Substitua as planilhas por uma timeline dinâmica. Acompanhe cada fase
          da implantação de unidades e franquias até a inauguração — com tarefas,
          responsáveis e replanejamento automático.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Entrar
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/units')}>
            Ver unidades
          </button>
        </div>
      </main>

      <section className="features">
        {features.map((f) => (
          <div key={f.id} className="feature-card">
            <h2 className="feature-title">{f.title}</h2>
            <p className="feature-desc">{f.description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
