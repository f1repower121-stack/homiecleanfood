'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

interface LoyaltyConfig {
  id: string; points_per_baht: number; first_order_bonus: number
  birthday_bonus: number; referral_bonus: number; tier_clean_eater: number
  tier_protein_king: number; multiplier_homie: number; multiplier_clean_eater: number
  multiplier_protein_king: number; min_redeem_points: number; points_to_baht: number
  max_redeem_pct: number
}
interface Reward {
  id: string; name: string; description: string; points_cost: number
  reward_type: string; reward_value: number; emoji: string; active: boolean; sort_order: number
}
interface Customer { id: string; full_name: string; points: number; tier: string; created_at: string }
interface Redemption {
  id: string; user_id: string; reward_name: string; points_spent: number
  discount_applied: number; status: string; created_at: string
}
const DEFAULT_CONFIG: LoyaltyConfig = {
  id: 'singleton', points_per_baht: 0.1, first_order_bonus: 50, birthday_bonus: 50,
  referral_bonus: 100, tier_clean_eater: 200, tier_protein_king: 500,
  multiplier_homie: 1.0, multiplier_clean_eater: 1.5, multiplier_protein_king: 2.0,
  min_redeem_points: 100, points_to_baht: 1.0, max_redeem_pct: 30,
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
export default function AdminLoyaltyTab({ darkMode = false }: { darkMode?: boolean }) {
  const dm = darkMode
  const card = dm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
  const muted = dm ? 'text-gray-400' : 'text-gray-500'
  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm ? 'bg-gray-800 border-gray-700 text-gray-100' : 'border-gray-200'}`
  const [section, setSection] = useState<'overview'|'earn'|'tiers'|'rewards'|'customers'|'history'>('overview')
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_CONFIG)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg] = useState('')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [editReward, setEditReward] = useState<Partial<Reward>|null>(null)
  const [isNewReward, setIsNewReward] = useState(false)
  const [rewardSaving, setRewardSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [custSearch, setCustSearch] = useState('')
  const [editingPoints, setEditingPoints] = useState<string|null>(null)
  const [pointsInput, setPointsInput] = useState('')
  const [pointsMode, setPointsMode] = useState<'add'|'set'>('add')
  const [pointsSaving, setPointsSaving] = useState(false)
  const [pointsMsg, setPointsMsg] = useState('')
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cfg } = await supabase.from('loyalty_config').select('*').eq('id','singleton').single()
      if (cfg) setConfig(cfg)
      const { data: rw } = await supabase.from('loyalty_rewards').select('*').order('sort_order')
      setRewards(rw || [])
      const { data: cust } = await supabase.from('profiles').select('id,full_name,points,tier,created_at').order('points',{ascending:false})
      setCustomers((cust||[]).map((c:any)=>({...c, tier: c.tier||getTierFromPoints(c.points||0, cfg||DEFAULT_CONFIG)})))
      const { data: red } = await supabase.from('loyalty_redemptions').select('*').order('created_at',{ascending:false}).limit(50)
      setRedemptions(red||[])
    } catch(e){ console.error(e) }
    setLoading(false)
  }, [])

  useEffect(()=>{ fetchAll() },[fetchAll])

  const saveConfig = async () => {
    setConfigSaving(true)
    const {error} = await supabase.from('loyalty_config').upsert({...config, updated_at: new Date().toISOString()})
    setConfigMsg(error ? '❌ Failed' : '✅ Saved!')
    setConfigSaving(false)
    setTimeout(()=>setConfigMsg(''),3000)
  }
  const saveReward = async () => {
    if (!editReward?.name||!editReward?.points_cost) return
    setRewardSaving(true)
    if (isNewReward) await supabase.from('loyalty_rewards').insert([{...editReward, sort_order: rewards.length+1}])
    else await supabase.from('loyalty_rewards').update(editReward).eq('id',editReward.id)
    setEditReward(null); fetchAll(); setRewardSaving(false)
  }
  const deleteReward = async (id:string) => {
    if (!confirm('Delete this reward?')) return
    await supabase.from('loyalty_rewards').delete().eq('id',id); fetchAll()
  }
  const toggleReward = async (id:string, active:boolean) => {
    await supabase.from('loyalty_rewards').update({active:!active}).eq('id',id)
    setRewards(prev=>prev.map(r=>r.id===id?{...r,active:!active}:r))
  }
  const applyPoints = async (customerId:string) => {
    const val = parseInt(pointsInput)
    if (isNaN(val)) return
    setPointsSaving(true)
    try {
      if (pointsMode==='set') {
        const cust = customers.find(c=>c.id===customerId)
        await supabase.rpc('add_points',{user_id:customerId, points_to_add: val-(cust?.points||0)})
        setPointsMsg(`✅ Points set to ${val}`)
      } else {
        await supabase.rpc('add_points',{user_id:customerId, points_to_add:val})
        setPointsMsg(`✅ ${val>0?'+':''}${val} pts applied`)
      }
      setEditingPoints(null); setPointsInput(''); fetchAll()
      setTimeout(()=>setPointsMsg(''),3000)
    } catch { setPointsMsg('❌ Failed'); setTimeout(()=>setPointsMsg(''),3000) }
    setPointsSaving(false)
  }

  const totalPoints = customers.reduce((s,c)=>s+(c.points||0),0)
  const tierCounts = {
    Homie: customers.filter(c=>c.tier==='Homie'||(!c.tier&&(c.points||0)<config.tier_clean_eater)).length,
    'Clean Eater': customers.filter(c=>c.tier==='Clean Eater').length,
    'Protein King': customers.filter(c=>c.tier==='Protein King').length,
  }
  const totalRedeemed = redemptions.reduce((s,r)=>s+(r.points_spent||0),0)
  const sections = [
    {key:'overview',label:'Overview',icon:'📊'},{key:'earn',label:'Earn Rules',icon:'⚡'},
    {key:'tiers',label:'Tiers',icon:'🏆'},{key:'rewards',label:'Rewards',icon:'🎁'},
    {key:'customers',label:'Customers',icon:'👥'},{key:'history',label:'History',icon:'📋'},
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Loyalty Program</h2>
        <p className={`text-sm ${muted}`}>Manage earn rules, tiers, rewards and customer points</p>
      </div>
      <div className={`flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto ${dm?'bg-gray-800':'bg-gray-100'}`}>
        {sections.map(s=>(
          <button key={s.key} onClick={()=>setSection(s.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${section===s.key?'bg-green-600 text-white shadow-sm':`${muted} hover:bg-white/50`}`}>
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {section==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {icon:'👥',label:'Total Members',value:customers.length,color:'from-blue-500 to-indigo-600'},
              {icon:'⭐',label:'Points in Circulation',value:totalPoints.toLocaleString(),color:'from-yellow-400 to-orange-500'},
              {icon:'🎁',label:'Total Redeemed',value:totalRedeemed.toLocaleString()+' pts',color:'from-purple-500 to-violet-600'},
              {icon:'🔥',label:'Active Rewards',value:rewards.filter(r=>r.active).length,color:'from-emerald-500 to-green-600'},
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
                <div className="flex justify-between"><span className={muted}>Per ฿10 spent</span><span className="font-medium">{Math.round(config.points_per_baht*10)} pt</span></div>
                <div className="flex justify-between"><span className={muted}>First order bonus</span><span className="font-medium">+{config.first_order_bonus} pts</span></div>
                <div className="flex justify-between"><span className={muted}>Birthday bonus</span><span className="font-medium">+{config.birthday_bonus} pts</span></div>
              </div>
              <div className="space-y-2">
                <p className={`font-medium text-xs uppercase tracking-wide ${muted} mb-2`}>Redeeming</p>
                <div className="flex justify-between"><span className={muted}>Min to redeem</span><span className="font-medium">{config.min_redeem_points} pts</span></div>
                <div className="flex justify-between"><span className={muted}>1 point =</span><span className="font-medium">฿{config.points_to_baht}</span></div>
                <div className="flex justify-between"><span className={muted}>Max discount</span><span className="font-medium">{config.max_redeem_pct}% of order</span></div>
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
            <input type="number" step="0.01" value={config.points_per_baht} onChange={e=>setConfig({...config,points_per_baht:parseFloat(e.target.value)||0})} className={inputCls} placeholder="0.1"/>
            <p className={`text-xs ${muted} mt-1`}>e.g. 0.1 = 1 point per ฿10</p>
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
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className="font-semibold mb-4">Redemption Rules</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${muted} block mb-1`}>Min points to redeem</label>
                <input type="number" value={config.min_redeem_points} onChange={e=>setConfig({...config,min_redeem_points:parseInt(e.target.value)||0})} className={inputCls}/>
              </div>
              <div>
                <label className={`text-xs font-medium ${muted} block mb-1`}>1 point = ฿</label>
                <input type="number" step="0.1" value={config.points_to_baht} onChange={e=>setConfig({...config,points_to_baht:parseFloat(e.target.value)||0})} className={inputCls}/>
              </div>
              <div>
                <label className={`text-xs font-medium ${muted} block mb-1`}>Max discount % of order</label>
                <input type="number" value={config.max_redeem_pct} onChange={e=>setConfig({...config,max_redeem_pct:parseInt(e.target.value)||0})} className={inputCls}/>
              </div>
            </div>
          </div>
          <button onClick={saveConfig} disabled={configSaving} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50">
            {configSaving?'Saving...':'💾 Save Earn & Redeem Rules'}
          </button>
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

      {section==='rewards' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${muted}`}>{rewards.filter(r=>r.active).length} active rewards</p>
            <button onClick={()=>{setIsNewReward(true);setEditReward({active:true,reward_type:'discount',emoji:'🎁',reward_value:0})}} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700">+ Add Reward</button>
          </div>
          {editReward && (
            <div className={`${card} border rounded-2xl p-5`}>
              <h3 className="font-bold mb-4">{isNewReward?'New Reward':'Edit Reward'}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Name *</label>
                  <input value={editReward.name||''} onChange={e=>setEditReward({...editReward,name:e.target.value})} className={inputCls} placeholder="e.g. Free Drink"/>
                </div>
                <div>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Emoji</label>
                  <input value={editReward.emoji||'🎁'} onChange={e=>setEditReward({...editReward,emoji:e.target.value})} className={inputCls}/>
                </div>
                <div>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Points Cost *</label>
                  <input type="number" value={editReward.points_cost||''} onChange={e=>setEditReward({...editReward,points_cost:parseInt(e.target.value)||0})} className={inputCls} placeholder="100"/>
                </div>
                <div>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Type</label>
                  <select value={editReward.reward_type||'discount'} onChange={e=>setEditReward({...editReward,reward_type:e.target.value})} className={inputCls}>
                    <option value="discount">💰 Baht Discount</option>
                    <option value="free_item">🍱 Free Item</option>
                    <option value="credit">🎁 Account Credit</option>
                    <option value="custom">✨ Custom</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>฿ Value</label>
                  <input type="number" value={editReward.reward_value??0} onChange={e=>setEditReward({...editReward,reward_value:parseFloat(e.target.value)||0})} className={inputCls} placeholder="50"/>
                </div>
                <div className="col-span-2">
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Description</label>
                  <input value={editReward.description||''} onChange={e=>setEditReward({...editReward,description:e.target.value})} className={inputCls} placeholder="Short description"/>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveReward} disabled={rewardSaving} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">{rewardSaving?'Saving...':'Save'}</button>
                <button onClick={()=>setEditReward(null)} className="border px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {rewards.map(r=>(
              <div key={r.id} className={`${card} border rounded-2xl p-4 flex items-center gap-3 ${!r.active?'opacity-50':''}`}>
                <div className="text-3xl w-12 text-center">{r.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.reward_type==='discount'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{r.reward_type}</span>
                  </div>
                  <p className={`text-xs ${muted}`}>{r.description}</p>
                  <span className="text-xs font-bold text-green-600">{r.points_cost} pts</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={()=>toggleReward(r.id,r.active)} className={`text-xs border px-3 py-1.5 rounded-xl ${r.active?'text-gray-500 hover:bg-gray-50':'text-green-600 hover:bg-green-50'}`}>{r.active?'Hide':'Show'}</button>
                  <button onClick={()=>{setIsNewReward(false);setEditReward(r)}} className="text-xs border px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-50">Edit</button>
                  <button onClick={()=>deleteReward(r.id)} className="text-xs border px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
            {rewards.length===0 && <div className={`text-center py-12 ${muted}`}><p className="text-3xl mb-2">🎁</p><p>No rewards yet</p></div>}
          </div>
        </div>
      )}

      {section==='customers' && (
        <div className="space-y-4">
          {pointsMsg && <div className={`p-3 rounded-xl text-sm font-medium ${pointsMsg.includes('✅')?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-600 border border-red-200'}`}>{pointsMsg}</div>}
          <div className="flex gap-3">
            <input placeholder="Search by name..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}/>
            <button onClick={fetchAll} className={`text-xs border px-3 py-2.5 rounded-xl ${muted} hover:bg-gray-50`}>↻ Refresh</button>
          </div>
          <div className={`${card} border rounded-2xl overflow-hidden`}>
            {customers.filter(c=>!custSearch||c.full_name?.toLowerCase().includes(custSearch.toLowerCase())).map(c=>{
              const tier=c.tier||getTierFromPoints(c.points||0,config)
              const badge=TIER_BADGE[tier]||TIER_BADGE['Homie']
              const isEditing=editingPoints===c.id
              return (
                <div key={c.id} className={`border-b last:border-0 ${isEditing?(dm?'bg-gray-800/50':'bg-green-50/50'):''}`}>
                  <div className="px-4 py-3 grid grid-cols-4 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                        {(c.full_name||'?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.full_name||'Unknown'}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.emoji} {badge.label}</span>
                      </div>
                    </div>
                    <div className="text-center"><span className="font-bold text-green-600">{(c.points||0).toLocaleString()}</span></div>
                    <div className="text-right">
                      {!isEditing
                        ? <button onClick={()=>{setEditingPoints(c.id);setPointsInput('');setPointsMode('add')}} className="text-xs border px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-50">Edit Points</button>
                        : <button onClick={()=>setEditingPoints(null)} className={`text-xs ${muted}`}>✕ Close</button>
                      }
                    </div>
                  </div>
                  {isEditing && (
                    <div className={`mx-4 mb-4 p-4 rounded-2xl border ${dm?'bg-gray-800 border-gray-700':'bg-white border-gray-200'} shadow-sm`}>
                      <div className="flex gap-2 mb-3">
                        <button onClick={()=>setPointsMode('add')} className={`flex-1 py-1.5 rounded-xl text-xs font-medium border ${pointsMode==='add'?'bg-green-600 text-white border-green-600':'border-gray-200 text-gray-600'}`}>Add / Remove</button>
                        <button onClick={()=>setPointsMode('set')} className={`flex-1 py-1.5 rounded-xl text-xs font-medium border ${pointsMode==='set'?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-600'}`}>Set Exact Value</button>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input type="number" placeholder={pointsMode==='add'?'e.g. 50 or -20':`Current: ${c.points||0}`} value={pointsInput} onChange={e=>setPointsInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyPoints(c.id)} className={`flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-700 border-gray-600 text-white':'border-gray-200'}`}/>
                        <button onClick={()=>applyPoints(c.id)} disabled={pointsSaving||!pointsInput} className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 ${pointsMode==='set'?'bg-blue-600':'bg-green-600'}`}>{pointsSaving?'...':pointsMode==='set'?'Set':'Apply'}</button>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className={`text-xs ${muted}`}>Quick:</span>
                        {[10,25,50,100,200,-50,-100].map(n=>(
                          <button key={n} onClick={()=>setPointsInput(String(n))} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${n>0?'border-green-200 text-green-600 hover:bg-green-50':'border-red-200 text-red-500 hover:bg-red-50'}`}>{n>0?`+${n}`:n}</button>
                        ))}
                      </div>
                      <p className={`text-xs ${muted} mt-2`}>
                        After: {Math.max(0,(c.points||0)+(pointsMode==='add'?(parseInt(pointsInput)||0):0))} pts · New tier: <span className="font-medium text-green-600">{getTierFromPoints(pointsMode==='set'?(parseInt(pointsInput)||0):Math.max(0,(c.points||0)+(parseInt(pointsInput)||0)),config)}</span>
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {customers.filter(c=>!custSearch||c.full_name?.toLowerCase().includes(custSearch.toLowerCase())).length===0 && (
              <div className={`text-center py-12 ${muted}`}>No customers found</div>
            )}
          </div>
        </div>
      )}

      {section==='history' && (
        <div>
          <div className="mb-4 flex justify-between">
            <p className={`text-sm ${muted}`}>{redemptions.length} redemptions</p>
            <button onClick={fetchAll} className={`text-xs border px-3 py-1.5 rounded-xl ${muted} hover:bg-gray-50`}>↻ Refresh</button>
          </div>
          {redemptions.length===0 ? (
            <div className={`text-center py-16 ${muted}`}><p className="text-3xl mb-2">📋</p><p>No redemptions yet</p></div>
          ) : (
            <div className={`${card} border rounded-2xl overflow-hidden`}>
              {redemptions.map(r=>(
                <div key={r.id} className="px-4 py-3 border-b last:border-0 grid grid-cols-4 items-center">
                  <div className="col-span-2">
                    <p className="text-sm font-medium">{r.reward_name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.status==='applied'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                  </div>
                  <div className="text-center"><span className="text-sm font-bold text-red-500">−{r.points_spent} pts</span></div>
                  <div className="text-right"><span className={`text-xs ${muted}`}>{new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
