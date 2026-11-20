import { useEffect, useMemo, useState } from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import { LayoutDashboard, ShoppingCart, Package, ReceiptText, LogOut, Plus, Search, RefreshCw, Smartphone, AlertTriangle, CreditCard, Users, Truck, Settings } from 'lucide-react'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase = url && key ? createClient(url, key) : null

type Product = { id: string; name: string; sku: string; category: string; cost: number; price: number; stock: number }
type Sale = { id: string; invoice_no: string; customer: string; payment_method: string; total: number; profit: number; created_at: string }
type CartLine = Product & { quantity: number }
type Account = {id:string;account_no:string;account_type:'installment'|'credit';customer_name:string;phone:string|null;principal:number;down_payment:number;balance:number;installment_count:number;first_due_date:string|null;due_date:string|null;status:string;created_at:string}
type AccountPayment = {id:string;account_id:string;amount:number;payment_method:string;paid_at:string;note:string|null}
type Supplier = {id:string;name:string;phone:string|null;address:string|null;opening_balance:number}
type SupplierPurchase = {id:string;supplier_id:string;total:number;paid:number;purchase_date:string;reference_no:string|null}
type SupplierPayment = {supplier_id:string;amount:number;purchase_id:string|null;payment_method:string;paid_at:string;note:string|null}
type Installment = {id:string;account_id:string;installment_no:number;due_date:string;amount:number;paid:number}
type StoreSettings = {store_name:string;currency:'USD'|'KHR';theme:'blue'|'emerald'|'violet'|'dark'}

const money = (n: number, currency:'USD'|'KHR'='USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency==='KHR'?0:2 }).format(Number(n || 0))
const dateText = (s: string) => new Date(s).toLocaleString()

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [page, setPage] = useState<'dashboard'|'pos'|'products'|'sales'|'accounts'|'suppliers'|'settings'>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({name:'',sku:'',category:'Accessories',cost:'',price:'',stock:''})
  const [customer, setCustomer] = useState('Walk-in customer')
  const [payment, setPayment] = useState('Cash')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierPurchases, setSupplierPurchases] = useState<SupplierPurchase[]>([])
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [accountPayments, setAccountPayments] = useState<AccountPayment[]>([])
  const [settings, setSettings] = useState<StoreSettings>({store_name:'Vira Phoneshop',currency:'USD',theme:'blue'})
  const [accountForm, setAccountForm] = useState({type:'installment',name:'',phone:'',description:'',principal:'',down:'0',count:'6',firstDue:new Date().toISOString().slice(0,10)})
  const [supplierForm, setSupplierForm] = useState({name:'',phone:'',address:'',opening:'0'})
  const [paymentForm, setPaymentForm] = useState({accountId:'',amount:'',method:'Cash',note:''})
  const [purchaseForm, setPurchaseForm] = useState({supplierId:'',reference:'',date:new Date().toISOString().slice(0,10),total:'',paid:'0',notes:''})
  const [supplierPaymentForm,setSupplierPaymentForm]=useState({supplierId:'',amount:'',method:'Cash',note:''})

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadData() {
    if (!supabase || !user) return
    setBusy(true); setMessage('')
    const [p, s, a, v, cfg, sp, sv, ins, ap] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('sales').select('id,invoice_no,customer,payment_method,total,profit,created_at').order('created_at', {ascending:false}).limit(100),
      supabase.from('customer_accounts').select('*').order('created_at',{ascending:false}),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('store_settings').select('store_name,currency,theme').eq('id',1).maybeSingle(),
      supabase.from('supplier_purchases').select('id,supplier_id,total,paid,purchase_date,reference_no'),
      supabase.from('supplier_payments').select('supplier_id,amount,purchase_id,payment_method,paid_at,note').order('paid_at',{ascending:false}).limit(200),
      supabase.from('account_installments').select('*').order('due_date'),
      supabase.from('account_payments').select('*').order('paid_at',{ascending:false}).limit(200)
    ])
    const firstError = [p,s,a,v,cfg,sp,sv,ins,ap].find(result => result.error)?.error
    if (firstError) setMessage(firstError.message)
    else { setProducts(p.data || []); setSales(s.data || []); setAccounts(a.data||[]); setSuppliers(v.data||[]); setSupplierPurchases(sp.data||[]); setSupplierPayments(sv.data||[]); setInstallments(ins.data||[]); setAccountPayments(ap.data||[]); if(cfg.data) setSettings(cfg.data as StoreSettings) }
    setBusy(false)
  }
  useEffect(() => { if (user) void loadData() }, [user])

  const cartTotal = useMemo(() => cart.reduce((sum, p) => sum + p.price * p.quantity, 0), [cart])
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
  const todayRevenue = todaySales.reduce((n,s)=>n+Number(s.total),0)
  const todayProfit = todaySales.reduce((n,s)=>n+Number(s.profit),0)
  const lowStock = products.filter(p => p.stock <= 5)

  async function login(e: React.FormEvent) {
    e.preventDefault(); if (!supabase) return
    setBusy(true); setMessage('')
    const {error} = await supabase.auth.signInWithPassword({email,password})
    setBusy(false); if (error) setMessage(error.message)
  }
  async function logout() { await supabase?.auth.signOut(); setProducts([]); setSales([]); setCart([]) }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault(); if (!supabase) return
    const row = {name:form.name.trim(),sku:form.sku.trim(),category:form.category.trim(),cost:Number(form.cost),price:Number(form.price),stock:Number(form.stock)}
    if (!row.name || !row.sku || row.price < 0 || row.cost < 0 || row.stock < 0) { setMessage('Please complete all product fields correctly.'); return }
    setBusy(true)
    const {error} = await supabase.from('products').insert(row)
    setBusy(false)
    if (error) setMessage(error.message)
    else { setShowAdd(false); setForm({name:'',sku:'',category:'Accessories',cost:'',price:'',stock:''}); await loadData(); setMessage('Product saved.') }
  }
  function addToCart(p: Product) {
    setCart(old => {
      const found = old.find(x=>x.id===p.id)
      if (found) return old.map(x=>x.id===p.id ? {...x,quantity:Math.min(x.quantity+1,p.stock)} : x)
      return p.stock > 0 ? [...old,{...p,quantity:1}] : old
    })
  }
  async function createAccount(e:React.FormEvent) {
    e.preventDefault(); if(!supabase) return
    const {error}=await supabase.rpc('create_customer_account',{p_type:accountForm.type,p_name:accountForm.name,p_phone:accountForm.phone,p_description:accountForm.description,p_principal:Number(accountForm.principal),p_down:Number(accountForm.down),p_count:accountForm.type==='installment'?Number(accountForm.count):1,p_first_due:accountForm.type==='installment'?accountForm.firstDue:null,p_due_date:accountForm.type==='credit'?accountForm.firstDue:null})
    if(error) setMessage(error.message); else {setMessage('Customer account created.');setAccountForm({...accountForm,name:'',phone:'',description:'',principal:'',down:'0'});await loadData()}
  }
  async function payAccount(e:React.FormEvent) {
    e.preventDefault(); if(!supabase||!paymentForm.accountId) return
    const {error}=await supabase.rpc('record_account_payment',{p_account:paymentForm.accountId,p_amount:Number(paymentForm.amount),p_method:paymentForm.method,p_note:paymentForm.note})
    if(error) setMessage(error.message); else {setMessage('Payment recorded.');setPaymentForm({accountId:'',amount:'',method:'Cash',note:''});await loadData()}
  }
  async function addSupplier(e:React.FormEvent) {
    e.preventDefault(); if(!supabase) return
    const {error}=await supabase.from('suppliers').insert({name:supplierForm.name,phone:supplierForm.phone||null,address:supplierForm.address||null,opening_balance:Number(supplierForm.opening)})
    if(error) setMessage(error.message); else {setSupplierForm({name:'',phone:'',address:'',opening:'0'});setMessage('Supplier saved.');await loadData()}
  }
  async function addPurchase(e:React.FormEvent) {
    e.preventDefault(); if(!supabase||!purchaseForm.supplierId) return
    const {error}=await supabase.rpc('record_supplier_purchase',{p_supplier:purchaseForm.supplierId,p_ref:purchaseForm.reference,p_date:purchaseForm.date,p_total:Number(purchaseForm.total),p_paid:Number(purchaseForm.paid),p_notes:purchaseForm.notes})
    if(error) setMessage(error.message); else {setMessage('Supplier purchase saved.');setPurchaseForm({...purchaseForm,reference:'',total:'',paid:'0',notes:''});await loadData()}
  }
  async function paySupplier(e:React.FormEvent) {
    e.preventDefault(); if(!supabase||!supplierPaymentForm.supplierId) return
    const {error}=await supabase.rpc('record_supplier_payment',{p_supplier:supplierPaymentForm.supplierId,p_amount:Number(supplierPaymentForm.amount),p_method:supplierPaymentForm.method,p_note:supplierPaymentForm.note})
    if(error) setMessage(error.message); else {setSupplierPaymentForm({supplierId:'',amount:'',method:'Cash',note:''});setMessage('Supplier payment recorded.');await loadData()}
  }
  async function saveSettings(e:React.FormEvent) {
    e.preventDefault(); if(!supabase) return
    const {error}=await supabase.from('store_settings').upsert({id:1,...settings,updated_at:new Date().toISOString()})
    if(error) setMessage(error.message); else setMessage('Settings saved.')
  }

  async function checkout() {
    if (!supabase || !cart.length) return
    setBusy(true); setMessage('')
    const {error} = await supabase.rpc('checkout_sale', {
      p_customer: customer || 'Walk-in customer',
      p_payment_method: payment,
      p_items: cart.map(x=>({product_id:x.id,quantity:x.quantity}))
    })
    setBusy(false)
    if (error) setMessage(error.message)
    else { setCart([]); setCustomer('Walk-in customer'); await loadData(); setMessage('Sale completed successfully.') }
  }

  if (!url || !key) return <main className="setup"><div className="login-card"><Smartphone size={34}/><h1>Vira Phoneshop</h1><p>Cloud setup is not complete yet.</p><p>Create a <code>.env</code> file using <code>.env.example</code> and add your Supabase project URL and publishable/anon key. See README.md.</p></div></main>
  if (!user) return <main className="login"><form className="login-card" onSubmit={login}><div className="brand-icon"><Smartphone/></div><h1>Vira Phoneshop</h1><p>Sign in to your store workspace</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary" disabled={busy}>{busy?'Please wait…':'Sign in'}</button>{message&&<div className="notice">{message}</div>}</form></main>

  return <div className={`app-shell theme-${settings.theme}`}>
    <aside className="sidebar"><div className="brand"><Smartphone/><div><b>{settings.store_name || 'Vira Phoneshop'}</b><small>POS MANAGEMENT</small></div></div>
      <nav>{([['dashboard','Dashboard',LayoutDashboard],['pos','Point of Sale',ShoppingCart],['products','Products & Stock',Package],['sales','Sales History',ReceiptText],['accounts','Credit & Installments',CreditCard],['suppliers','Suppliers',Truck],['settings','Settings',Settings]] as const).map(([id,label,Icon])=><button key={id} className={page===id?'selected':''} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-bottom"><small>{user.email}</small><button onClick={logout}><LogOut size={17}/>Sign out</button></div>
    </aside>
    <main className="main">
      <header><div><span className="eyebrow">STORE MANAGEMENT</span><h1>{({dashboard:'Dashboard',pos:'Point of Sale',products:'Products & Stock',sales:'Sales History',accounts:'Credit & Installments',suppliers:'Suppliers',settings:'System Settings'})[page]}</h1></div><button className="icon-btn" onClick={()=>void loadData()} title="Refresh"><RefreshCw size={18}/></button></header>
      {message&&<div className="notice" role="status">{message}<button onClick={()=>setMessage('')}>×</button></div>}
      {busy&&<div className="muted">Loading…</div>}
      {page==='dashboard'&&<><section className="stats"><Stat label="Today's Revenue" value={money(todayRevenue,settings.currency)}/><Stat label="Today's Profit" value={money(todayProfit,settings.currency)}/><Stat label="Products" value={String(products.length)}/><Stat label="Low Stock Items" value={String(lowStock.length)}/></section><section className="two-col"><div className="card"><h2>Recent sales</h2><SalesTable sales={sales.slice(0,6)} currency={settings.currency}/></div><div className="card"><h2><AlertTriangle size={17}/> Low stock alerts</h2>{lowStock.length?lowStock.map(p=><div className="list-row" key={p.id}><span>{p.name}<small>{p.sku}</small></span><b className="warning">{p.stock} left</b></div>):<p className="muted">No low stock products.</p>}</div></section></>}
      {page==='pos'&&<section className="pos-layout"><div className="card"><div className="section-head"><h2>Choose products</h2><div className="search"><Search size={16}/><input placeholder="Search name or SKU" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="product-grid">{products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(search.toLowerCase())&&p.stock>0).map(p=><button className="product-tile" key={p.id} onClick={()=>addToCart(p)}><b>{p.name}</b><small>{p.sku} · {p.stock} in stock</small><strong>{money(p.price,settings.currency)}</strong></button>)}</div></div><div className="card cart-card"><h2>Current order</h2>{cart.length?cart.map(p=><div className="cart-line" key={p.id}><div><b>{p.name}</b><small>{money(p.price,settings.currency)} each</small></div><div className="qty"><button onClick={()=>setCart(old=>old.map(x=>x.id===p.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))}>−</button><b>{p.quantity}</b><button onClick={()=>addToCart(p)}>+</button></div></div>):<p className="muted">Your cart is empty.</p>}<label>Customer<input value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label>Payment<select value={payment} onChange={e=>setPayment(e.target.value)}><option>Cash</option><option>ABA / Bank</option><option>QR Payment</option><option>Credit</option></select></label><div className="total"><span>Total</span><b>{money(cartTotal,settings.currency)}</b></div><button className="primary" disabled={!cart.length||busy} onClick={()=>void checkout()}>{busy?'Processing…':'Complete sale'}</button><small className="muted">Stock is deducted in the database when checkout succeeds.</small></div></section>}
      {page==='products'&&<section className="card"><div className="section-head"><h2>Product inventory</h2><button className="primary compact" onClick={()=>setShowAdd(true)}><Plus size={16}/> Add product</button></div><div className="search full"><Search size={16}/><input placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th></tr></thead><tbody>{products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(search.toLowerCase())).map(p=><tr key={p.id}><td>{p.name}</td><td>{p.sku}</td><td>{p.category}</td><td>{money(p.cost,settings.currency)}</td><td>{money(p.price,settings.currency)}</td><td className={p.stock<=5?'warning':''}>{p.stock}</td></tr>)}</tbody></table></div></section>}
      {page==='sales'&&<section className="card"><h2>Sales history</h2><SalesTable sales={sales} currency={settings.currency}/></section>}
      {page==='accounts'&&<div className="module-grid"><section className="card"><h2>Create customer account</h2><form className="module-form" onSubmit={createAccount}><label>Account type<select value={accountForm.type} onChange={e=>setAccountForm({...accountForm,type:e.target.value})}><option value="installment">Installment plan</option><option value="credit">Credit sale / debt</option></select></label><label>Customer name<input required value={accountForm.name} onChange={e=>setAccountForm({...accountForm,name:e.target.value})}/></label><label>Phone<input value={accountForm.phone} onChange={e=>setAccountForm({...accountForm,phone:e.target.value})}/></label><label>Product / note<input value={accountForm.description} onChange={e=>setAccountForm({...accountForm,description:e.target.value})}/></label><label>Total amount ({settings.currency})<input required type="number" min="0.01" step="0.01" value={accountForm.principal} onChange={e=>setAccountForm({...accountForm,principal:e.target.value})}/></label><label>Down payment ({settings.currency})<input type="number" min="0" step="0.01" value={accountForm.down} onChange={e=>setAccountForm({...accountForm,down:e.target.value})}/></label>{accountForm.type==='credit'&&<label>Debt due date<input type="date" required value={accountForm.firstDue} onChange={e=>setAccountForm({...accountForm,firstDue:e.target.value})}/></label>}{accountForm.type==='installment'&&<><label>Number of payments<input type="number" min="1" max="120" value={accountForm.count} onChange={e=>setAccountForm({...accountForm,count:e.target.value})}/></label><label>First due date<input type="date" required value={accountForm.firstDue} onChange={e=>setAccountForm({...accountForm,firstDue:e.target.value})}/></label></>}<button className="primary">Create account</button></form></section><section className="card"><h2>Record payment</h2><form className="module-form" onSubmit={payAccount}><label>Customer account<select required value={paymentForm.accountId} onChange={e=>setPaymentForm({...paymentForm,accountId:e.target.value})}><option value="">Choose account</option>{accounts.filter(a=>a.status==='active').map(a=><option key={a.id} value={a.id}>{a.account_no} · {a.customer_name} · {money(Number(a.balance),settings.currency)}</option>)}</select></label><label>Amount<input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:e.target.value})}/></label><label>Payment method<select value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm,method:e.target.value})}><option>Cash</option><option>ABA / Bank</option><option>QR Payment</option></select></label><label>Note<input value={paymentForm.note} onChange={e=>setPaymentForm({...paymentForm,note:e.target.value})}/></label><button className="primary">Save payment</button></form></section><section className="card wide"><h2>Customer balances</h2><div className="table-wrap"><table><thead><tr><th>Account</th><th>Type</th><th>Customer</th><th>Principal</th><th>Down payment</th><th>Balance</th><th>Status</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td>{a.account_no}</td><td>{a.account_type==='installment'?'Installment':'Credit'}</td><td>{a.customer_name}<small className="table-sub">{a.phone||''}</small></td><td>{money(Number(a.principal),settings.currency)}</td><td>{money(Number(a.down_payment),settings.currency)}</td><td><b>{money(Number(a.balance),settings.currency)}</b></td><td>{a.status}{a.account_type==='credit'&&a.due_date?<small className="table-sub">Due: {a.due_date}</small>:null}</td></tr>)}{!accounts.length&&<tr><td colSpan={7} className="muted">No customer accounts yet.</td></tr>}</tbody></table></div></section><section className="card wide"><h2>Customer payment history</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Account</th><th>Customer</th><th>Method</th><th>Note</th><th>Amount</th></tr></thead><tbody>{accountPayments.map(p=>{const a=accounts.find(x=>x.id===p.account_id);return <tr key={p.id}><td>{dateText(p.paid_at)}</td><td>{a?.account_no||'—'}</td><td>{a?.customer_name||'—'}</td><td>{p.payment_method}</td><td>{p.note||'—'}</td><td><b>{money(Number(p.amount),settings.currency)}</b></td></tr>})}{!accountPayments.length&&<tr><td colSpan={6} className="muted">No payments recorded yet.</td></tr>}</tbody></table></div></section><section className="card wide"><h2>Installment schedule</h2><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Installment</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{installments.map(i=>{const a=accounts.find(x=>x.id===i.account_id);return <tr key={i.id}><td>{a?.customer_name||'—'}</td><td>#{i.installment_no}</td><td>{i.due_date}</td><td>{money(Number(i.amount),settings.currency)}</td><td>{money(Number(i.paid),settings.currency)}</td><td>{money(Number(i.amount)-Number(i.paid),settings.currency)}</td><td>{Number(i.paid)>=Number(i.amount)?'Paid':i.due_date<new Date().toISOString().slice(0,10)?'Overdue':'Upcoming'}</td></tr>})}{!installments.length&&<tr><td colSpan={7} className="muted">No installment schedule yet.</td></tr>}</tbody></table></div></section></div>}
      {page==='suppliers'&&<div className="module-grid"><section className="card"><h2>Add supplier</h2><form className="module-form" onSubmit={addSupplier}><label>Supplier name<input required value={supplierForm.name} onChange={e=>setSupplierForm({...supplierForm,name:e.target.value})}/></label><label>Phone<input value={supplierForm.phone} onChange={e=>setSupplierForm({...supplierForm,phone:e.target.value})}/></label><label>Address<input value={supplierForm.address} onChange={e=>setSupplierForm({...supplierForm,address:e.target.value})}/></label><label>Opening balance ({settings.currency})<input type="number" min="0" step="0.01" value={supplierForm.opening} onChange={e=>setSupplierForm({...supplierForm,opening:e.target.value})}/></label><button className="primary">Save supplier</button></form></section><section className="card"><h2>Record purchase / payable</h2><form className="module-form" onSubmit={addPurchase}><label>Supplier<select required value={purchaseForm.supplierId} onChange={e=>setPurchaseForm({...purchaseForm,supplierId:e.target.value})}><option value="">Choose supplier</option>{suppliers.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Reference number<input value={purchaseForm.reference} onChange={e=>setPurchaseForm({...purchaseForm,reference:e.target.value})}/></label><label>Purchase date<input type="date" value={purchaseForm.date} onChange={e=>setPurchaseForm({...purchaseForm,date:e.target.value})}/></label><label>Total ({settings.currency})<input required type="number" min="0.01" step="0.01" value={purchaseForm.total} onChange={e=>setPurchaseForm({...purchaseForm,total:e.target.value})}/></label><label>Paid now ({settings.currency})<input type="number" min="0" step="0.01" value={purchaseForm.paid} onChange={e=>setPurchaseForm({...purchaseForm,paid:e.target.value})}/></label><label>Notes<input value={purchaseForm.notes} onChange={e=>setPurchaseForm({...purchaseForm,notes:e.target.value})}/></label><button className="primary">Save purchase</button></form></section><section className="card"><h2>Pay supplier balance</h2><form className="module-form" onSubmit={paySupplier}><label>Supplier<select required value={supplierPaymentForm.supplierId} onChange={e=>setSupplierPaymentForm({...supplierPaymentForm,supplierId:e.target.value})}><option value="">Choose supplier</option>{suppliers.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Payment amount ({settings.currency})<input required type="number" min="0.01" step="0.01" value={supplierPaymentForm.amount} onChange={e=>setSupplierPaymentForm({...supplierPaymentForm,amount:e.target.value})}/></label><label>Method<select value={supplierPaymentForm.method} onChange={e=>setSupplierPaymentForm({...supplierPaymentForm,method:e.target.value})}><option>Cash</option><option>ABA / Bank</option><option>QR Payment</option></select></label><label>Note<input value={supplierPaymentForm.note} onChange={e=>setSupplierPaymentForm({...supplierPaymentForm,note:e.target.value})}/></label><button className="primary">Record supplier payment</button></form></section><section className="card wide"><h2>Supplier directory & balances</h2><div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Phone</th><th>Address</th><th>Opening balance</th><th>Purchase due</th><th>Supplier balance</th></tr></thead><tbody>{suppliers.map(v=>{const purchased=supplierPurchases.filter(x=>x.supplier_id===v.id).reduce((n,x)=>n+Number(x.total)-Number(x.paid),0);const paid=supplierPayments.filter(x=>x.supplier_id===v.id&&!x.purchase_id).reduce((n,x)=>n+Number(x.amount),0);return <tr key={v.id}><td>{v.name}</td><td>{v.phone||'—'}</td><td>{v.address||'—'}</td><td>{money(Number(v.opening_balance),settings.currency)}</td><td>{money(purchased,settings.currency)}</td><td><b>{money(Number(v.opening_balance)+purchased-paid,settings.currency)}</b></td></tr>})}{!suppliers.length&&<tr><td colSpan={4} className="muted">No suppliers saved yet.</td></tr>}</tbody></table></div></section><section className="card wide"><h2>Supplier purchase history</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Supplier</th><th>Reference</th><th>Total</th><th>Paid</th><th>Remaining</th></tr></thead><tbody>{supplierPurchases.map(x=>{const v=suppliers.find(y=>y.id===x.supplier_id);return <tr key={x.id}><td>{x.purchase_date}</td><td>{v?.name||'—'}</td><td>{x.reference_no||'—'}</td><td>{money(Number(x.total),settings.currency)}</td><td>{money(Number(x.paid),settings.currency)}</td><td><b>{money(Number(x.total)-Number(x.paid),settings.currency)}</b></td></tr>})}{!supplierPurchases.length&&<tr><td colSpan={6} className="muted">No supplier purchases recorded yet.</td></tr>}</tbody></table></div></section><section className="card wide"><h2>Supplier payment history</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Supplier</th><th>Method</th><th>Reference</th><th>Note</th><th>Amount</th></tr></thead><tbody>{supplierPayments.map((x,i)=>{const v=suppliers.find(y=>y.id===x.supplier_id);const purchase=x.purchase_id?supplierPurchases.find(y=>y.id===x.purchase_id):null;return <tr key={`${x.supplier_id}-${x.paid_at}-${i}`}><td>{dateText(x.paid_at)}</td><td>{v?.name||'—'}</td><td>{x.payment_method}</td><td>{purchase?.reference_no||'—'}</td><td>{x.note||'—'}</td><td><b>{money(Number(x.amount),settings.currency)}</b></td></tr>})}{!supplierPayments.length&&<tr><td colSpan={6} className="muted">No supplier payments recorded yet.</td></tr>}</tbody></table></div></section></div>}
      {page==='settings'&&<section className="card settings-card"><h2>Store appearance & preferences</h2><form className="module-form settings-form" onSubmit={saveSettings}><label>Store name<input value={settings.store_name} onChange={e=>setSettings({...settings,store_name:e.target.value})}/></label><label>Currency display<select value={settings.currency} onChange={e=>setSettings({...settings,currency:e.target.value as 'USD'|'KHR'})}><option value="USD">USD — US Dollar</option><option value="KHR">KHR — Cambodian Riel</option></select></label><label>Theme / Skin<select value={settings.theme} onChange={e=>setSettings({...settings,theme:e.target.value as StoreSettings['theme']})}><option value="blue">Blue (Default)</option><option value="emerald">Emerald Green</option><option value="violet">Violet</option><option value="dark">Dark</option></select></label><div className="theme-preview"><span className="swatch blue"></span><span className="swatch emerald"></span><span className="swatch violet"></span><span className="swatch dark"></span><span>Theme preview</span></div><button className="primary">Save settings</button><p className="muted">Currency selection changes display only. It does not convert stored amounts or exchange rates.</p></form></section>}
    </main>
    {showAdd&&<div className="modal-backdrop"><form className="modal" onSubmit={addProduct}><div className="section-head"><h2>Add product</h2><button type="button" className="icon-btn" onClick={()=>setShowAdd(false)}>×</button></div>{(['name','sku','category','cost','price','stock'] as const).map(k=><label key={k}>{({name:'Product name',sku:'SKU / IMEI reference',category:'Category',cost:`Cost price (${settings.currency})`,price:`Selling price (${settings.currency})`,stock:'Opening stock'})[k]}<input required value={form[k]} type={['cost','price','stock'].includes(k)?'number':'text'} min={['cost','price','stock'].includes(k)?'0':undefined} step={['cost','price'].includes(k)?'0.01':undefined} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<button className="primary" disabled={busy}>Save product</button></form></div>}
  </div>
}
function Stat({label,value}:{label:string,value:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function SalesTable({sales,currency}:{sales:Sale[];currency:'USD'|'KHR'}){return <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.invoice_no}</td><td>{dateText(s.created_at)}</td><td>{s.customer}</td><td>{s.payment_method}</td><td><b>{money(Number(s.total),currency)}</b></td></tr>)}{!sales.length&&<tr><td colSpan={5} className="muted">No sales recorded yet.</td></tr>}</tbody></table></div>}
