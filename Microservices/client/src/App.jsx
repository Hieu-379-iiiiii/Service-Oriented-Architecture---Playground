import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:3000'
const AUTH_URL = 'http://localhost:3001'

function getStoredToken() {
  return localStorage.getItem('accessToken') || ''
}

function getStoredRefreshToken() {
  return localStorage.getItem('refreshToken') || ''
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [token, setToken] = useState(getStoredToken())

  useEffect(() => {
    const onLocation = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onLocation)
    return () => window.removeEventListener('popstate', onLocation)
  }, [])

  const navigate = (nextPath) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setToken('')
    navigate('/login')
  }

  useEffect(() => {
    if (!token && path !== '/login' && path !== '/forgot-password' && path !== '/reset-password' && path !== '/games') {
      navigate('/login')
    }
  }, [token, path])

  const renderPage = () => {
    if (path === '/login') {
      return <LoginPage onLogin={(newToken) => { setToken(newToken); navigate('/dashboard') }} onNavigate={navigate} />
    }

    if (path === '/forgot-password') {
      return <ForgotPasswordPage onNavigate={navigate} />
    }

    if (path === '/reset-password') {
      return <ResetPasswordPage onNavigate={navigate} />
    }

    if (path === '/games') {
      return <GamesPage />
    }

    if (path === '/dashboard') {
      return <DashboardPage token={token} onLogout={logout} />
    }

    return <DashboardPage token={token} onLogout={logout} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Microservice Demo</div>
        <nav className="nav">
          {!token ? (
            <>
              <button onClick={() => navigate('/login')}>Login</button>
              <button onClick={() => navigate('/forgot-password')}>Forgot password</button>
              <button onClick={() => navigate('/games')}>Games</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button onClick={() => navigate('/games')}>Games</button>
              <button onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </header>
      <main className="container">{renderPage()}</main>
    </div>
  )
}

function LoginPage({ onLogin, onNavigate }) {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('Demo123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${AUTH_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      onLogin(data.accessToken)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        {error && <p className="error">{error}</p>}
      </form>
      <button className="link-button" onClick={() => onNavigate('/forgot-password')}>
        Forgot password?
      </button>
    </section>
  )
}

function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('demo@example.com')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${AUTH_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Reset request failed')
      }

      setMessage(data.message)
      if (data.otpCode) {
        setMessage(`${data.message} Demo OTP: ${data.otpCode}`)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card auth-card">
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit">Send OTP</button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <button className="link-button" onClick={() => onNavigate('/login')}>Back to login</button>
    </section>
  )
}

function ResetPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('demo@example.com')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${AUTH_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Reset failed')
      }

      setMessage(data.message)
      setOtpCode('')
      setNewPassword('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card auth-card">
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          OTP code
          <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
        </label>
        <label>
          New password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <button type="submit">Reset password</button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <button className="link-button" onClick={() => onNavigate('/login')}>Back to login</button>
    </section>
  )
}

function GamesPage() {
  const [search, setSearch] = useState('')
  const [games, setGames] = useState([])

  useEffect(() => {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    fetch(`${API_URL}/api/games${query}`)
      .then((response) => response.json())
      .then((data) => setGames(Array.isArray(data) ? data : []))
      .catch(() => setGames([]))
  }, [search])

  return (
    <section className="card">
      <h1>Games</h1>
      <div className="search-box">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games..."
        />
      </div>
      <div className="list-grid">
        {games.map((game) => (
          <article key={game.id} className="item-card">
            <h3>{game.title}</h3>
            <p>{game.genre}</p>
            <strong>${Number(game.price).toFixed(2)}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

function DashboardPage({ token, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [ownedGames, setOwnedGames] = useState([])
  const [tickets, setTickets] = useState([])
  const [subject, setSubject] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')

  const fetchDashboardData = async () => {
    try {
      const [profileResponse, gamesResponse, ticketsResponse] = await Promise.all([
        fetch(`${API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/me/games`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (!profileResponse.ok) {
        onLogout()
        return
      }

      setProfile(await profileResponse.json())
      setOwnedGames(await gamesResponse.json())
      setTickets(await ticketsResponse.json())
    } catch (error) {
      console.error('Failed to fetch dashboard data', error)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [token])

  const handleTicketSubmit = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ticket_subject: subject })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Ticket creation failed')
      }

      setTicketMessage(`Ticket created: ${data.id}`)
      setSubject('')
      fetchDashboardData()
    } catch (error) {
      setTicketMessage(error.message)
    }
  }

  return (
    <section className="dashboard">
      <div className="card">
        <h1>Dashboard</h1>
        {profile ? (
          <div>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Name:</strong> {profile.first_name || 'N/A'} {profile.last_name || ''}</p>
            <p><strong>Verified:</strong> {String(profile.is_verified)}</p>
          </div>
        ) : (
          <p>Loading profile...</p>
        )}
      </div>

      <div className="card">
        <h2>Owned games</h2>
        <ul>{ownedGames.length ? ownedGames.map((game) => <li key={game.id}>{game.title}</li>) : <li>No games yet</li>}</ul>
      </div>

      <div className="card">
        <h2>Create ticket</h2>
        <form className="stack" onSubmit={handleTicketSubmit}>
          <label>
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <button type="submit">Create Ticket</button>
        </form>
        {ticketMessage && <p className="success">{ticketMessage}</p>}
      </div>

      <div className="card">
        <h2>My tickets</h2>
        <ul>
          {tickets.length ? tickets.map((ticket) => (
            <li key={ticket.id}>
              <strong>{ticket.ticket_subject}</strong> - {ticket.ticket_status}
            </li>
          )) : <li>No tickets yet</li>}
        </ul>
      </div>
    </section>
  )
}

export default App
