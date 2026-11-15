import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, CalendarDays, ChevronLeft, ChevronRight, CirclePlus, Clock3, Flame, History, LoaderCircle, Plus, Sparkles, Target, Trash2, Utensils, X } from 'lucide-react';
import './style.css';

const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const CAL_GOAL = 2500, PROTEIN_GOAL = 90;
const todayISO = () => new Date().toLocaleDateString('en-CA');
const fmt = (n) => Math.round(Number(n || 0)).toLocaleString('en-IN');
const localKey = (d) => `nutri-day-${d}`;
function readDay(date) { try { return JSON.parse(localStorage.getItem(localKey(date)) || '[]'); } catch { return []; } }
function writeDay(date, entries) { localStorage.setItem(localKey(date), JSON.stringify(entries)); }
function App() {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState(() => readDay(todayISO()));
  const [foodText, setFoodText] = useState('');
  const [meal, setMeal] = useState('Meal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('today');
  const [historyDates, setHistoryDates] = useState([]);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goals, setGoals] = useState(() => JSON.parse(localStorage.getItem('nutri-goals') || '{"calories":2500,"protein":90}'));

  useEffect(() => { setEntries(readDay(date)); }, [date]);
  useEffect(() => { writeDay(date, entries); }, [entries, date]);
  useEffect(() => { const dates = Object.keys(localStorage).filter(k => k.startsWith('nutri-day-') && JSON.parse(localStorage.getItem(k) || '[]').length).map(k => k.replace('nutri-day-', '')).sort().reverse(); setHistoryDates(dates); }, [entries, date]);
  const totals = useMemo(() => entries.reduce((a, e) => ({ calories: a.calories + Number(e.calories || 0), protein: a.protein + Number(e.protein || 0) }), { calories: 0, protein: 0 }), [entries]);
  const addFood = async () => {
    if (!foodText.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/estimate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: foodText, meal }) });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch {
        throw new Error(`The API returned HTML instead of JSON. Set VITE_API_URL to your running backend before rebuilding the app${API_BASE ? '.' : ' (the APK cannot use the computer localhost).'}`);
      }
      if (!response.ok) throw new Error(data.error || 'Could not estimate food. Check the backend and Groq key.');
      const record = { id: crypto.randomUUID(), meal, description: foodText.trim(), calories: Number(data.total_calories), protein: Number(data.total_protein), items: data.items || [], notes: data.notes || '', createdAt: new Date().toISOString() };
      setEntries(old => [record, ...old]); setFoodText('');
    } catch (e) { setError(`${e.message} You can still keep your history locally once the API is connected.`); }
    finally { setBusy(false); }
  };
  const removeEntry = (id) => setEntries(old => old.filter(x => x.id !== id));
  const setGoal = (key, value) => { const next = { ...goals, [key]: Math.max(1, Number(value) || 1) }; setGoals(next); localStorage.setItem('nutri-goals', JSON.stringify(next)); };
  const changeDate = (delta) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + delta); setDate(d.toLocaleDateString('en-CA')); setTab('today'); };
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const calPct = Math.min(100, totals.calories / goals.calories * 100), proPct = Math.min(100, totals.protein / goals.protein * 100);

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon"><Activity size={20}/></div><div><b>NutriTrack <span>AI</span></b><small>YOUR DAILY NUTRITION COMPANION</small></div></div><button className="icon-btn" onClick={() => setEditingGoals(v => !v)} title="Edit daily goals"><Target size={19}/></button></header>
    <main>
      <section className="welcome"><div><p className="eyebrow">NUTRITION OVERVIEW</p><h1>{tab === 'today' ? 'Your daily progress' : 'Your food history'}</h1><p className="sub">Track what you eat. Understand what your body gets.</p></div><div className="date-chip"><CalendarDays size={15}/>{date === todayISO() ? 'TODAY' : date}</div></section>
      {editingGoals && <section className="goal-editor panel"><div className="section-head"><b>Daily targets</b><button className="icon-btn" onClick={() => setEditingGoals(false)}><X size={16}/></button></div><div className="goal-inputs"><label>Calories (kcal)<input type="number" value={goals.calories} onChange={e => setGoal('calories', e.target.value)}/></label><label>Protein (g)<input type="number" value={goals.protein} onChange={e => setGoal('protein', e.target.value)}/></label></div></section>}
      <nav className="tabs"><button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}><Utensils size={16}/> Daily log</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History size={16}/> History</button></nav>
      {tab === 'today' ? <>
        <section className="date-nav"><button className="icon-btn" onClick={() => changeDate(-1)}><ChevronLeft/></button><div><b>{dateLabel}</b><small>{date === todayISO() ? 'Today’s food journal' : 'Viewing saved daily journal'}</small></div><button className="icon-btn" onClick={() => changeDate(1)} disabled={date >= todayISO()}><ChevronRight/></button></section>
        <section className="stats-grid"><div className="stat-card"><div className="stat-top"><span className="stat-icon orange"><Flame size={18}/></span><span className="stat-label">CALORIES</span></div><div className="stat-value">{fmt(totals.calories)} <small>kcal</small></div><div className="progress"><i style={{width:`${calPct}%`}}/></div><div className="stat-foot"><b>{Math.round(calPct)}%</b><span>of {fmt(goals.calories)} kcal goal</span></div></div><div className="stat-card"><div className="stat-top"><span className="stat-icon green"><Activity size={18}/></span><span className="stat-label">PROTEIN</span></div><div className="stat-value">{fmt(totals.protein)} <small>g</small></div><div className="progress greenbar"><i style={{width:`${proPct}%`}}/></div><div className="stat-foot"><b>{Math.round(proPct)}%</b><span>of {fmt(goals.protein)} g goal</span></div></div></section>
        <section className="panel add-panel"><div className="section-head"><div><p className="eyebrow">AI FOOD ESTIMATOR</p><h2>What did you eat?</h2></div><span className="ai-pill"><Sparkles size={13}/> GROQ AI</span></div><div className="meal-select">{['Breakfast','Lunch','Snacks','Dinner','Meal'].map(m => <button key={m} className={meal === m ? 'selected' : ''} onClick={() => setMeal(m)}>{m}</button>)}</div><textarea value={foodText} onChange={e => setFoodText(e.target.value)} placeholder="Example: 5 medium roti, 2 katori dal, 1 plate rice, rajma sabji..." rows={4}/><div className="input-foot"><span>Describe portions for better estimates</span><span>{foodText.length}/1000</span></div>{error && <div className="error-msg">{error}</div>}<button className="primary-btn" disabled={busy || !foodText.trim()} onClick={addFood}>{busy ? <><LoaderCircle className="spin" size={17}/> Estimating nutrition...</> : <><Sparkles size={17}/> Estimate calories & protein</>}</button></section>
        <section className="panel result-panel"><div className="section-head"><div><p className="eyebrow">DAILY FOOD HISTORY</p><h2>Food entries <span className="count">{entries.length}</span></h2></div><span className="muted-label"><Clock3 size={14}/> Saved on this device</span></div>{entries.length === 0 ? <div className="empty"><div className="empty-icon"><Utensils size={22}/></div><b>No meals logged yet</b><p>Add your first food entry above. Your daily totals will appear here.</p></div> : <div className="entry-list">{entries.map(e => <article className="entry" key={e.id}><div className="entry-main"><div className="entry-title"><b>{e.meal}</b><time>{new Date(e.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</time></div><p>{e.description}</p><div className="entry-numbers"><span><Flame size={13}/> {fmt(e.calories)} kcal</span><span><Activity size={13}/> {fmt(e.protein)} g protein</span></div>{e.items?.length > 0 && <details><summary>View food breakdown ({e.items.length})</summary><div className="breakdown">{e.items.map((it,i)=><div key={i}><span>{it.food}{it.quantity ? ` · ${it.quantity}` : ''}</span><b>{fmt(it.calories)} kcal · {fmt(it.protein)} g</b></div>)}</div></details>}{e.notes && <small className="note">AI note: {e.notes}</small>}</div><button className="delete-btn" onClick={() => removeEntry(e.id)} title="Delete entry"><Trash2 size={16}/></button></article>)}</div>}</section>
      </> : <section className="panel history-panel"><div className="section-head"><div><p className="eyebrow">PAST NUTRITION</p><h2>Daily history</h2></div><span className="muted-label">{historyDates.length} days tracked</span></div>{historyDates.length === 0 ? <div className="empty"><div className="empty-icon"><History size={22}/></div><b>Your history starts here</b><p>Once you log food, each day will be saved here automatically.</p></div> : historyDates.map(d => { const es=readDay(d), sum=es.reduce((a,e)=>({c:a.c+e.calories,p:a.p+e.protein}),{c:0,p:0}); return <button className="history-row" key={d} onClick={()=>{setDate(d);setTab('today')}}><div className="history-date"><b>{new Date(`${d}T12:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</b><small>{new Date(`${d}T12:00:00`).toLocaleDateString('en-IN',{weekday:'long',year:'numeric'})}</small></div><div className="history-totals"><b>{fmt(sum.c)} kcal</b><small>{fmt(sum.p)} g protein · {es.length} entries</small></div><ChevronRight size={18}/></button>; })}</section>}
      <footer>Nutrition values are AI estimates, not laboratory measurements. Verify portions and ingredients for accuracy.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
