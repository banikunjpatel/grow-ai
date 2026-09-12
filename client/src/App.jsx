import { useState } from 'react'
import { validateResponse } from '../../contract.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
    const [screen, setScreen] = useState('setup')
    const [growing, setGrowing] = useState('')
    const [blocker, setBlocker] = useState('')
    const [history, setHistory] = useState([])
    const [current, setCurrent] = useState(null)
    const [reflection, setReflection] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleStart = async (e) => {
        e.preventDefault()
        setError('')

        if (!growing.trim()) {
            setError('Tell me what you\'re growing first.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/grow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ growing, blocker, history: [] })
            })

            if (!res.ok) {
                const data = await res.json()
                setError(data.error || 'Something went wrong')
                setLoading(false)
                return
            }

            const data = await res.json()
            const result = validateResponse(data)
            if (!result.ok) {
                setError(result.error)
                setLoading(false)
                return
            }
            setCurrent(result.value)
            setScreen('action')
        } catch (err) {
            setError('Failed to connect to server')
        }
        setLoading(false)
    }

    const handleReflect = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const newHistory = [...history, { stage: current.stage, action: current.action, reflection }]
            const res = await fetch(`${API_BASE}/api/grow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ growing, blocker, history: newHistory })
            })

            if (!res.ok) {
                const data = await res.json()
                setError(data.error || 'Something went wrong')
                setLoading(false)
                return
            }

            const data = await res.json()
            const result = validateResponse(data)
            if (!result.ok) {
                setError(result.error)
                setLoading(false)
                return
            }
            setHistory(newHistory)
            setCurrent(result.value)
            setReflection('')
            setScreen('action')
        } catch (err) {
            setError('Failed to connect to server')
        }
        setLoading(false)
    }

    const handleReset = () => {
        setScreen('setup')
        setCurrent(null)
        setHistory([])
        setReflection('')
        setError('')
    }

    return (
        <div>
            {screen === 'setup' && (
                <div className="screen">
                    <h1>GROW</h1>
                    <p>What are you growing?</p>

                    {error && <div className="error">{error}</div>}

                    <form onSubmit={handleStart}>
                        <div className="form-group">
                            <label htmlFor="growing">Growing</label>
                            <input
                                id="growing"
                                type="text"
                                value={growing}
                                onChange={(e) => setGrowing(e.target.value)}
                                placeholder="e.g., my confidence, a habit, a skill"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="blocker">Blocker (optional)</label>
                            <textarea
                                id="blocker"
                                value={blocker}
                                onChange={(e) => setBlocker(e.target.value)}
                                placeholder="What's holding you back?"
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" disabled={loading}>
                            {loading ? 'Starting...' : 'Start Growing'}
                        </button>
                    </form>
                </div>
            )}

            {screen === 'action' && current && (
                <div className="screen">
                    <div className="stage-badge">{current.stage}</div>
                    <h2>{growing}</h2>

                    {error && <div className="error">{error}</div>}

                    <div className="principle">
                        <strong>Principle:</strong> {current.principle}
                    </div>

                    <div className="action">
                        <strong>Action:</strong> {current.action}
                    </div>

                    <p>
                        <span className="minutes">{current.minutes} minutes</span>
                    </p>

                    <form onSubmit={handleReflect}>
                        <div className="form-group">
                            <label htmlFor="reflection">How did it go?</label>
                            <textarea
                                id="reflection"
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                                placeholder="What did you learn? What's next?"
                                disabled={loading}
                            />
                        </div>

                        <div className="button-group">
                            <button type="submit" disabled={loading || !reflection.trim()}>
                                {loading ? 'Growing...' : 'Reflect & Continue'}
                            </button>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={handleReset}
                                disabled={loading}
                            >
                                Reset
                            </button>
                        </div>
                    </form>

                    {history.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3>History</h3>
                            {history.map((item, idx) => (
                                <div key={idx} className="history-item">
                                    <div className="history-stage">{item.stage}</div>
                                    <div className="history-action"><strong>Action:</strong> {item.action}</div>
                                    <div className="history-reflection"><strong>Reflection:</strong> {item.reflection}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
