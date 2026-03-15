'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDateTimeICT } from '@/lib/dateUtils'
import { Search, ChevronUp, FileDown, RefreshCw } from 'lucide-react'

interface LoyaltyConfig {
  id: string; points_per_baht: number; first_order_bonus: number
  birthday_bonus: number; referral_bonus: number; tier_clean_eater: number
  tier_protein_king: number; multiplier_homie: number; multiplier_clean_eater: number
  multiplier_protein_king: number
}
interface Customer { id: string; full_name: string; points: number; tier: string; created_at: string }
const DEFAULT_CONFIG: LoyaltyConfig = {
  id: 'singleton', points_per_baht: 0.01, first_order_bonus: 50, birthday_bonus: 50,
  referral_bonus: 50, tier_clean_eater: 200, tier_protein_king: 500,
  multiplier_homie: 1.0, multiplier_clean_eater: 1.5, multiplier_protein_king: 2.0,
}
function getTierFromPoints(pts: number, cfg: LoyaltyConfig): string {
  if (pts >= cfg.tier_protein_king) return 'Protein King'
  if (pts >= cfg.tier_clean_eater) return 'Clean Eater'
  return 'Homie'
}
const TIER_BADGE: Record<string, { label: string; cls: string; emoji: string }> = {
  'Homie': { label: 'Homie', cls: 'bg-gray-100 text-gray-600', emoji: '🌱' },
  'Clean Eater': { label: 'Clean Eater', cls: 'bg-lime-100 text-lime-700', emoji: '🥗' },
  'Protein King': { label: 'Protein King', cls: 'bg-amber-100 text-amber-700', emoji: '👑' },
}
interface AdminLoyaltyTabProps {
  darkMode?: boolean
  /** Customers for overview stats (from admin API) */
  customers?: Customer[]
  /** Loading state when customers are being fetched by parent */
  customersLoading?: boolean
}

const AdminLoyaltyTab = ({ darkMode = false, customers: propCustomers, customersLoading = false }: AdminLoyaltyTabProps) => {
  const dm = darkMode
  const card = dm ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
  const muted = dm ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200'}`
  const [section, setSection] = useState<'overview'|'earn'|'tiers'|'history'>('overview')
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_CONFIG)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg] = useState('')
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([])
  const [configLoading, setConfigLoading] = useState(true)

  // Use customers from parent (API) when provided, else local fetch
  const customers = propCustomers ?? localCustomers
  const loading = (propCustomers ? customersLoading : configLoading) || configLoading

  const fetchAll = useCallback(async () => {
    setConfigLoading(true)
    try {
      const { data: cfg } = await supabase.from('loyalty_config').select('*').eq('id','singleton').single()
      if (cfg) setConfig(cfg)
      if (!propCustomers?.length) {
        const { data: cust } = await supabase.from('profiles').select('id,full_name,points,tier,created_at').order('points',{ascending:false})
        setLocalCustomers((cust||[]).map((c:any)=>({...c, tier: c.tier||getTierFromPoints(c.points||0, cfg||DEFAULT_CONFIG)})))
      }
    } catch(e){ console.error(e) }
    setConfigLoading(false)
  }, [propCustomers?.length])

  useEffect(()=>{ fetchAll() },[fetchAll])

  const saveConfig = async () => {
    setConfigSaving(true)
    const {error} = await supabase.from('loyalty_config').upsert({...config, updated_at: new Date().toISOString()})
    setConfigMsg(error ? '❌ Failed' : '✅ Saved!')
    setConfigSaving(false)
    setTimeout(()=>setConfigMsg(''),3000)
  }
  const totalPoints = customers.reduce((s,c)=>s+(c.points||0),0)
  const tierCounts = {
    Homie: customers.filter(c=>c.tier==='Homie'||(!c.tier&&(c.points||0)<config.tier_clean_eater)).length,
    'Clean Eater': customers.filter(c=>c.tier==='Clean Eater').length,
    'Protein King': customers.filter(c=>c.tier==='Protein King').length,
  }
  const sections = [
    {key:'overview',label:'Overview',icon:'📊'},{key:'earn',label:'Earn Rules',icon:'⚡'},
    {key:'tiers',label:'Tiers',icon:'🏆'},{key:'history',label:'Points History',icon:'📋'},
  ]

  const [pointsHistory, setPointsHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historySort, setHistorySort] = useState<'date'|'user'>('date')
  const fetchPointsHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/admin/loyalty-history')
      const data = await res.json()
      setPointsHistory(data.transactions || [])
    } catch { setPointsHistory([]) }
    setHistoryLoading(false)
  }, [])
  useEffect(() => { if (section === 'history') fetchPointsHistory() }, [section, fetchPointsHistory])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Loyalty Program</h2>
        <p className={`text-sm ${muted}`}>Manage earn rules and tier thresholds</p>
      </div>
      <div className={`flex gap-1 p-1 rounded-lg mb-6 overflow-x-auto ${dm?'bg-slate-800':'bg-slate-100'}`}>
        {sections.map(s=>(
          <button key={s.key} onClick={()=>setSection(s.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${section===s.key?'bg-slate-900 dark:bg-slate-700 text-white':`${muted} hover:bg-slate-200 dark:hover:bg-slate-700`}`}>
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {section==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {icon:'👥',label:'Total Members',value:customers.length,color:'from-blue-500 to-indigo-600'},
              {icon:'⭐',label:'Points in Circulation',value:totalPoints.toLocaleString(),color:'from-yellow-400 to-orange-500'},
              {icon:'🔥',label:'Active Members',value:customers.filter(c=>(c.points||0)>0).length,color:'from-emerald-500 to-green-600'},
            ].map(s=>(
              <div key={s.label} className={`${card} border rounded-2xl p-4`}>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-base mb-3`}>{s.icon}</div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className={`text-xs ${muted} mt-0.5`}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className="font-semibold text-sm mb-4">Tier Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(tierCounts).map(([tier,count])=>{
                const b=TIER_BADGE[tier]; const pct=customers.length?Math.round((count/customers.length)*100):0
                return (
                  <div key={tier} className="text-center">
                    <div className="text-3xl mb-2">{b.emoji}</div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${b.cls}`}>{b.label}</div>
                    <div className={`text-xs ${muted} mt-1`}>{pct}% of members</div>
                    <div className={`mt-2 h-1.5 ${dm?'bg-gray-700':'bg-gray-100'} rounded-full overflow-hidden`}>
                      <div className="h-full bg-green-500 rounded-full" style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className="font-semibold text-sm mb-4">Current Rules Summary</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className={`font-medium text-xs uppercase tracking-wide ${muted} mb-2`}>Earning</p>
                <div className="flex justify-between"><span className={muted}>Per ฿100 spent</span><span className="font-medium">{Math.round(config.points_per_baht*100)} pt</span></div>
                <div className="flex justify-between"><span className={muted}>First order bonus</span><span className="font-medium">+{config.first_order_bonus} pts</span></div>
                <div className="flex justify-between"><span className={muted}>Birthday bonus</span><span className="font-medium">+{config.birthday_bonus} pts</span></div>
                <div className="flex justify-between"><span className={muted}>Referral bonus</span><span className="font-medium">+{config.referral_bonus} pts</span></div>
              </div>
              <div className="space-y-2">
                <p className={`font-medium text-xs uppercase tracking-wide ${muted} mb-2`}>Tiers</p>
                <div className="flex justify-between"><span className={muted}>Clean Eater from</span><span className="font-medium">{config.tier_clean_eater} pts</span></div>
                <div className="flex justify-between"><span className={muted}>Protein King from</span><span className="font-medium">{config.tier_protein_king} pts</span></div>
                <div className="flex justify-between"><span className={muted}>Clean Eater multiplier</span><span className="font-medium">{config.multiplier_clean_eater}x</span></div>
                <div className="flex justify-between"><span className={muted}>Protein King multiplier</span><span className="font-medium">{config.multiplier_protein_king}x</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {section==='earn' && (
        <div className="space-y-5 max-w-2xl">
          {configMsg && <div className={`p-3 rounded-xl text-sm font-medium ${configMsg.includes('✅')?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-600 border border-red-200'}`}>{configMsg}</div>}
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className="font-semibold mb-4">Points per Purchase</h3>
            <label className={`text-xs font-medium ${muted} block mb-1`}>Points earned per ฿1 spent</label>
            <input type="number" step="0.001" value={config.points_per_baht} onChange={e=>setConfig({...config,points_per_baht:parseFloat(e.target.value)||0})} className={inputCls} placeholder="0.01"/>
            <p className={`text-xs ${muted} mt-1`}>e.g. 0.01 = 1 point per ฿100</p>
            <div className={`mt-3 p-3 rounded-xl text-sm ${dm?'bg-gray-800':'bg-gray-50'}`}>
              Preview: ฿300 order earns <span className="text-green-600 font-bold">{Math.round(300*config.points_per_baht)} points</span>
            </div>
          </div>
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className="font-semibold mb-4">Bonus Points</h3>
            <div className="grid grid-cols-2 gap-4">
              {[{key:'first_order_bonus',label:'First Order Bonus',icon:'🎉'},{key:'birthday_bonus',label:'Birthday Bonus',icon:'🎂'},{key:'referral_bonus',label:'Referral Bonus',icon:'📣'}].map(f=>(
                <div key={f.key}>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>{f.icon} {f.label}</label>
                  <input type="number" value={(config as any)[f.key]} onChange={e=>setConfig({...config,[f.key]:parseInt(e.target.value)||0})} className={inputCls} placeholder="50"/>
                </div>
              ))}
            </div>
          </div>
          <button onClick={saveConfig} disabled={configSaving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50">
            {configSaving?'Saving...':'💾 Save Earn Rules'}
          </button>
        </div>
      )}

      {section==='history' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Points audit trail</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input placeholder="Search by name..." value={historySearch} onChange={e=>setHistorySearch(e.target.value)} className={`pl-9 pr-3 py-2 border rounded-lg text-sm w-48 ${dm?'bg-slate-800 border-slate-700':'border-slate-200'}`}/>
              </div>
              <button onClick={fetchPointsHistory} disabled={historyLoading} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                <RefreshCw className={`w-4 h-4 ${historyLoading?'animate-spin':''}`}/>
              </button>
            </div>
          </div>
          <div className={`${card} border rounded-lg overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${dm?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'}`}>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-right py-3 px-4 font-medium">Points</th>
                    <th className="text-left py-3 px-4 font-medium">Source</th>
                    <th className="text-left py-3 px-4 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyLoading ? [] : pointsHistory)
                    .filter(t=>!historySearch||t.user_name?.toLowerCase().includes(historySearch.toLowerCase()))
                    .slice(0,100)
                    .map((t,i)=>(
                      <tr key={i} className={`border-b ${dm?'border-slate-800 hover:bg-slate-800/50':'border-slate-100 hover:bg-slate-50'}`}>
                        <td className="py-3 px-4 text-slate-500">{formatDateTimeICT(t.created_at)}</td>
                        <td className="py-3 px-4 font-medium">{t.user_name}</td>
                        <td className={`py-3 px-4 text-right font-semibold tabular-nums ${t.points_delta>=0?'text-emerald-600':'text-rose-600'}`}>{t.points_delta>=0?'+':''}{t.points_delta}</td>
                        <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded ${t.source==='order'?'bg-blue-100 text-blue-700':t.source==='referral'?'bg-amber-100 text-amber-700':t.source==='manual'?'bg-slate-100 text-slate-600':'bg-purple-100 text-purple-700'}`}>{t.source}</span></td>
                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">{t.reference_label||'—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!historyLoading && pointsHistory.length===0 && <div className={`text-center py-12 ${muted}`}>No point transactions yet</div>}
          </div>
        </div>
      )}

      {section==='tiers' && (
        <div className="space-y-5 max-w-2xl">
          {configMsg && <div className={`p-3 rounded-xl text-sm font-medium ${configMsg.includes('✅')?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-600 border border-red-200'}`}>{configMsg}</div>}
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className="font-semibold mb-4">Tier Thresholds & Multipliers</h3>
            <div className="space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-xl ${dm?'bg-gray-800':'bg-gray-50'}`}>
                <span className="text-2xl">🌱</span>
                <div className="flex-1"><p className="font-semibold text-sm">Homie</p><p className={`text-xs ${muted}`}>0 pts — starting tier</p></div>
                <div className="text-right"><p className={`text-xs ${muted}`}>Multiplier</p>
                  <input type="number" step="0.1" value={config.multiplier_homie} onChange={e=>setConfig({...config,multiplier_homie:parseFloat(e.target.value)||1})} className={`w-20 border rounded-xl px-3 py-1.5 text-sm text-center outline-none ${dm?'bg-gray-700 border-gray-600 text-white':'border-gray-200 bg-white'}`}/>
                </div>
              </div>
              <div className={`flex items-center gap-4 p-4 rounded-xl border-2 border-lime-200 ${dm?'bg-gray-800':'bg-lime-50'}`}>
                <span className="text-2xl">🥗</span>
                <div className="flex-1"><p className="font-semibold text-sm">Clean Eater</p>
                  <input type="number" value={config.tier_clean_eater} onChange={e=>setConfig({...config,tier_clean_eater:parseInt(e.target.value)||0})} className={`w-32 border rounded-xl px-3 py-1.5 text-sm outline-none mt-1 ${dm?'bg-gray-700 border-gray-600 text-white':'border-gray-200 bg-white'}`}/>
                </div>
                <div className="text-right"><p className={`text-xs ${muted}`}>Multiplier</p>
                  <input type="number" step="0.1" value={config.multiplier_clean_eater} onChange={e=>setConfig({...config,multiplier_clean_eater:parseFloat(e.target.value)||1})} className={`w-20 border rounded-xl px-3 py-1.5 text-sm text-center outline-none ${dm?'bg-gray-700 border-gray-600 text-white':'border-gray-200 bg-white'}`}/>
                </div>
              </div>
              <div className={`flex items-center gap-4 p-4 rounded-xl border-2 border-amber-200 ${dm?'bg-gray-800':'bg-amber-50'}`}>
                <span className="text-2xl">👑</span>
                <div className="flex-1"><p className="font-semibold text-sm">Protein King</p>
                  <input type="number" value={config.tier_protein_king} onChange={e=>setConfig({...config,tier_protein_king:parseInt(e.target.value)||0})} className={`w-32 border rounded-xl px-3 py-1.5 text-sm outline-none mt-1 ${dm?'bg-gray-700 border-gray-600 text-white':'border-gray-200 bg-white'}`}/>
                </div>
                <div className="text-right"><p className={`text-xs ${muted}`}>Multiplier</p>
                  <input type="number" step="0.1" value={config.multiplier_protein_king} onChange={e=>setConfig({...config,multiplier_protein_king:parseFloat(e.target.value)||1})} className={`w-20 border rounded-xl px-3 py-1.5 text-sm text-center outline-none ${dm?'bg-gray-700 border-gray-600 text-white':'border-gray-200 bg-white'}`}/>
                </div>
              </div>
            </div>
          </div>
          <button onClick={saveConfig} disabled={configSaving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50">
            {configSaving?'Saving...':'💾 Save Tier Settings'}
          </button>
        </div>
      )}

    </div>
  )
}

export default AdminLoyaltyTab
