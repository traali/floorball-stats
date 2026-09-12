import { createHashRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { TeamPage } from './pages/TeamPage'
import { MatchPage } from './pages/MatchPage'

export const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/team/:teamId', element: <TeamPage /> },
      { path: '/match/:matchId', element: <MatchPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
