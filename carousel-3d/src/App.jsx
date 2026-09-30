import ProjectsOverview from './components/ProjectsOverview.jsx'
import ProjectPlaceholder from './components/ProjectPlaceholder.jsx'
import Cursor from './components/Cursor.jsx'
import { projects } from './data/projects.js'

// 원본 layout.tsx 에 해당: 상하단 그라디언트 오버레이 + main + 커서
export default function App() {
  const isProjectPage = window.location.pathname.startsWith('/projects')

  return (
    <>
      <div className="Overlay Overlay--top" />
      <div className="Overlay Overlay--bottom" />
      <main className="Main">
        {isProjectPage ? <ProjectPlaceholder /> : <ProjectsOverview data={projects} />}
      </main>
      <Cursor />
    </>
  )
}
