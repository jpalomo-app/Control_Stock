import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://etjfgjpycfjqfmmtmiuf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0amZnanB5Y2ZqcWZtbXRtaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5MzgsImV4cCI6MjA5NDc0MDkzOH0.KlQ3dAIGxQ6FFlJ1AI5wodNFPHw6CKOAxEzxTdO3aWo";
const SERVICE_KEY  = import.meta.env.VITE_SUPABASE_SERVICE_KEY || "";

const C = {
  primary:"#6B2D8B", primaryDk:"#4A1E63", primaryLt:"#EDE5F5",
  bg:"#F4F1F8", surface:"#FFFFFF", border:"#DDD5EB", borderLt:"#EDE5F5",
  text:"#1A1A2E", muted:"#7A708A",
  ok:"#2E7D32", okBg:"#E8F5E9",
  low:"#E65100", lowBg:"#FFF3E0",
  out:"#C62828", outBg:"#FFEBEE",
};

const api = {
  h: (token) => ({
    "Content-Type":"application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${token || SUPABASE_KEY}`
  }),
  async get(t, p="", token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?${p}`, { headers: this.h(token) });
    return r.json();
  },
  async post(t, b, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}`, {
      method:"POST", headers:{...this.h(token),"Prefer":"return=representation"}, body:JSON.stringify(b)
    });
    return r.json();
  },
  async patch(t, id, b, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, {
      method:"PATCH", headers:{...this.h(token),"Prefer":"return=representation"}, body:JSON.stringify(b)
    });
    return r.json();
  },
  async del(t, id, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method:"DELETE", headers:this.h(token) });
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method:"POST", headers: this.h(token)
    });
  }
};

const CATEGORIES = ["Todas","Electrónica","Mobiliario","Papelería","Otro"];
const STATUS = {
  ok:  { label:"OK",        color:C.ok,  bg:C.okBg  },
  low: { label:"Bajo",      color:C.low, bg:C.lowBg },
  out: { label:"Sin stock", color:C.out, bg:C.outBg },
};
const getStatus = (s,m) => s===0?"out":s<m?"low":"ok";
const qrPayload  = sku => JSON.stringify({sku});

const ROLE_LABELS = { admin:"Administrador", operador:"Operador", lectura:"Solo lectura" };
const ROLE_COLORS = { admin:C.primary, operador:C.ok, lectura:C.muted };

function QRImg({ sku, size=160 }) {
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrPayload(sku))}&color=4A1E63&bgcolor=FFFFFF`} width={size} height={size} alt={`QR ${sku}`} style={{ display:"block", borderRadius:4 }} />;
}

function Badge({ status }) {
  const s = STATUS[status];
  return <span style={{ background:s.bg,color:s.color,border:`1px solid ${s.color}30`,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase" }}>{s.label}</span>;
}

function Card({ children, style={} }) {
  return <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,...style }}>{children}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"#1A1A2E99",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface,borderRadius:12,boxShadow:"0 20px 60px #1A1A2E30",padding:32,width:460,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <h3 style={{ margin:0,color:C.text,fontSize:16,fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22,lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block",color:C.muted,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6,fontWeight:600 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type="text", min, placeholder, disabled }) {
  return (
    <input type={type} value={value} onChange={onChange} min={min} placeholder={placeholder} disabled={disabled}
      style={{ width:"100%",background:disabled?C.borderLt:C.bg,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"inherit",transition:"border-color .15s" }}
      onFocus={e=>{ if(!disabled) e.target.style.borderColor=C.primary; }}
      onBlur={e=>e.target.style.borderColor=C.border}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ width:"100%",background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"inherit" }}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant="primary", disabled=false, sx={} }) {
  const v = {
    primary: { background:C.primary,color:"#fff",border:"none" },
    outline: { background:"transparent",color:C.primary,border:`1.5px solid ${C.primary}` },
    ghost:   { background:C.bg,color:C.muted,border:`1.5px solid ${C.border}` },
    scan:    { background:C.primaryLt,color:C.primary,border:`1.5px solid ${C.border}` },
    danger:  { background:"#FFEBEE",color:C.out,border:`1px solid ${C.out}30` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding:"9px 20px",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",opacity:disabled?.6:1,transition:"background .15s",...v[variant],...sx }}>{children}</button>
  );
}

// ── Login ───────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      const data = await api.signIn(email, password);
      if (data.error || !data.access_token) { setError("Email o contraseña incorrectos"); setLoading(false); return; }
      const token = data.access_token;
      const userId = data.user.id;
      const profiles = await api.get("user_profiles", `id=eq.${userId}`, token);
      if (!profiles || profiles.length === 0) { setError("Usuario sin perfil asignado. Contactá al administrador."); setLoading(false); return; }
      onLogin({ token, userId, profile: profiles[0] });
    } catch { setError("Error de conexión. Intentá de nuevo."); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width:400,maxWidth:"94vw" }}>
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <div style={{ width:56,height:56,borderRadius:14,background:C.primary,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" opacity=".9"/>
              <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" opacity=".6"/>
              <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" opacity=".6"/>
              <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" opacity=".3"/>
            </svg>
          </div>
          <div style={{ fontWeight:700,fontSize:22,color:C.text }}>Control de Stock</div>
          <div style={{ color:C.muted,fontSize:14,marginTop:4 }}>Sista S.A.</div>
        </div>
        <Card style={{ padding:32 }}>
          <Field label="Email"><Input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="usuario@sista.com.ar" /></Field>
          <Field label="Contraseña"><Input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" /></Field>
          {error && <div style={{ background:C.outBg,border:`1px solid ${C.out}30`,borderRadius:8,padding:"10px 14px",color:C.out,fontSize:13,marginBottom:16 }}>{error}</div>}
          <Btn onClick={handleLogin} disabled={loading} sx={{ width:"100%",padding:"12px",fontSize:15 }}>
            {loading?"Ingresando…":"Ingresar"}
          </Btn>
        </Card>
        <div style={{ textAlign:"center",color:C.muted,fontSize:12,marginTop:20 }}>Solo el administrador puede crear nuevos usuarios</div>
      </div>
    </div>
  );
}

// ── QR Scanner ──────────────────────────────────────────────────────────────
function QRScanner({ onScan, onClose }) {
  const videoRef=useRef(null),canvasRef=useRef(null),rafRef=useRef(null),streamRef=useRef(null);
  const [error,setError]=useState(null),[ready,setReady]=useState(false),[jsQR,setJsQR]=useState(null);
  useEffect(()=>{ if(window.jsQR){setJsQR(()=>window.jsQR);return;} const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"; s.onload=()=>setJsQR(()=>window.jsQR); s.onerror=()=>setError("No se pudo cargar jsQR."); document.head.appendChild(s); },[]);
  useEffect(()=>{ if(!jsQR)return; let active=true; navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(stream=>{ if(!active){stream.getTracks().forEach(t=>t.stop());return;} streamRef.current=stream; const v=videoRef.current;v.srcObject=stream;v.play(); v.onloadedmetadata=()=>{if(active)setReady(true);}; }).catch(e=>{if(active)setError("Sin acceso a la cámara: "+e.message);}); return()=>{active=false;streamRef.current?.getTracks().forEach(t=>t.stop());cancelAnimationFrame(rafRef.current);}; },[jsQR]);
  useEffect(()=>{ if(!ready||!jsQR)return; const v=videoRef.current,c=canvasRef.current,ctx=c.getContext("2d"); function tick(){ if(v.readyState===v.HAVE_ENOUGH_DATA){ c.width=v.videoWidth;c.height=v.videoHeight;ctx.drawImage(v,0,0); const img=ctx.getImageData(0,0,c.width,c.height); const code=jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"}); if(code){onScan(code.data);return;} } rafRef.current=requestAnimationFrame(tick); } rafRef.current=requestAnimationFrame(tick); return()=>cancelAnimationFrame(rafRef.current); },[ready,jsQR,onScan]);
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:16 }}>
      {error?<div style={{ color:C.out,fontSize:13,textAlign:"center",padding:20 }}>{error}</div>:(
        <><div style={{ position:"relative",width:280,height:280,borderRadius:12,overflow:"hidden",border:`2px solid ${C.border}`,background:"#000" }}>
          <video ref={videoRef} style={{ width:"100%",height:"100%",objectFit:"cover" }} muted playsInline />
          {[{top:0,left:0,borderTop:`3px solid ${C.primary}`,borderLeft:`3px solid ${C.primary}`},{bottom:0,left:0,borderBottom:`3px solid ${C.primary}`,borderLeft:`3px solid ${C.primary}`},{top:0,right:0,borderTop:`3px solid ${C.primary}`,borderRight:`3px solid ${C.primary}`},{bottom:0,right:0,borderBottom:`3px solid ${C.primary}`,borderRight:`3px solid ${C.primary}`}].map((s,i)=><div key={i} style={{ position:"absolute",width:22,height:22,borderRadius:2,...s }} />)}
          <div style={{ position:"absolute",left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${C.primary},transparent)`,animation:"scanline 1.8s linear infinite" }} /></div>
          <p style={{ color:ready?C.muted:C.primary,fontSize:13,margin:0 }}>{ready?"Apuntá al QR del producto":"Iniciando cámara…"}</p>
        </>)}
      <canvas ref={canvasRef} style={{ display:"none" }} />
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
    </div>
  );
}

// ── User Management ─────────────────────────────────────────────────────────
function UserModal({ session, onClose }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [newName,  setNewName]  = useState("");
  const [newRole,  setNewRole]  = useState("operador");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);

  useEffect(()=>{ loadUsers(); },[]);

  async function loadUsers() {
    setLoading(true);
    const data = await api.get("user_profiles","order=created_at.asc", session.token);
    setUsers(Array.isArray(data)?data:[]);
    setLoading(false);
  }

  async function createUser() {
    if(!newEmail||!newPass||!newName){ setError("Completá todos los campos"); return; }
    if(newPass.length < 6){ setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({ email:newEmail, password:newPass, email_confirm:true })
      });
      const data = await r.json();
      if(data.error||!data.id){ setError(data.msg||data.message||data.error||"Error al crear usuario"); setSaving(false); return; }
      await api.post("user_profiles",{ id:data.id, full_name:newName, role:newRole }, session.token);
      setNewEmail(""); setNewPass(""); setNewName(""); setNewRole("operador");
      setSuccess(`Usuario ${newName} creado correctamente ✓`);
      await loadUsers();
    } catch(e) { setError("Error de conexión: " + e.message); }
    setSaving(false);
  }

  async function deleteUser(id) {
    if(!confirm("¿Eliminar este usuario?")) return;
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`,{
      method:"DELETE",
      headers:{ "apikey":SERVICE_KEY, "Authorization":`Bearer ${SERVICE_KEY}` }
    });
    await api.del("user_profiles",id,session.token);
    await loadUsers();
  }

  return (
    <Modal title="Gestión de usuarios" onClose={onClose}>
      <div style={{ background:C.bg,borderRadius:8,padding:16,marginBottom:24 }}>
        <div style={{ color:C.primary,fontSize:12,fontWeight:700,marginBottom:12,letterSpacing:"0.06em",textTransform:"uppercase" }}>Nuevo usuario</div>
        <Field label="Nombre completo"><Input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Juan Pérez" /></Field>
        <Field label="Email"><Input value={newEmail} onChange={e=>setNewEmail(e.target.value)} type="email" placeholder="juan@sista.com.ar" /></Field>
        <Field label="Contraseña"><Input value={newPass} onChange={e=>setNewPass(e.target.value)} type="password" placeholder="Mínimo 6 caracteres" /></Field>
        <Field label="Rol">
          <Select value={newRole} onChange={e=>setNewRole(e.target.value)} options={[
            {value:"admin",   label:"Administrador"},
            {value:"operador",label:"Operador"},
            {value:"lectura", label:"Solo lectura"}
          ]} />
        </Field>
        {error   && <div style={{ color:C.out,fontSize:12,marginBottom:12,background:C.outBg,padding:"8px 12px",borderRadius:6 }}>{error}</div>}
        {success && <div style={{ color:C.ok, fontSize:12,marginBottom:12,background:C.okBg, padding:"8px 12px",borderRadius:6 }}>{success}</div>}
        <Btn onClick={createUser} disabled={saving} sx={{ width:"100%" }}>{saving?"Creando…":"Crear usuario"}</Btn>
      </div>

      <div style={{ color:C.muted,fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10 }}>Usuarios existentes</div>
      {loading ? <div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:16 }}>Cargando…</div> : (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {users.map(u=>(
            <div key={u.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg,borderRadius:8,padding:"10px 14px" }}>
              <div>
                <div style={{ fontWeight:600,color:C.text,fontSize:14 }}>{u.full_name}</div>
                <span style={{ background:C.primaryLt,color:ROLE_COLORS[u.role],fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20 }}>{ROLE_LABELS[u.role]}</span>
              </div>
              {u.id !== session.userId && (
                <button onClick={()=>deleteUser(u.id)} style={{ background:C.outBg,border:`1px solid ${C.out}20`,color:C.out,padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600 }}>Eliminar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [session,    setSession]    = useState(null);
  const [products,   setProducts]   = useState([]);
  const [movements,  setMovements]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState("Todas");
  const [statusFilt, setStatusFilt] = useState("Todos");
  const [modal,      setModal]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState({});
  const [moveQty,    setMoveQty]    = useState("");
  const [moveType,   setMoveType]   = useState("entrada");
  const [scanTarget, setScanTarget] = useState(null);
  const [toast,      setToast]      = useState(null);

  const role      = session?.profile?.role;
  const canEdit   = role === "admin" || role === "operador";
  const canManage = role === "admin";

  function showToast(msg, color=C.ok) { setToast({msg,color}); setTimeout(()=>setToast(null),3000); }

  const loadData = useCallback(async(token)=>{
    setLoading(true);
    try {
      const t = token || session?.token;
      const [prods,movs] = await Promise.all([
        api.get("products","order=name.asc",t),
        api.get("movements","order=created_at.desc&limit=50",t)
      ]);
      setProducts(Array.isArray(prods)?prods:[]);
      setMovements(Array.isArray(movs)?movs:[]);
    } catch { showToast("Error al conectar",C.out); }
    setLoading(false);
  },[session]);

  function handleLogin(sess) { setSession(sess); loadData(sess.token); }

  async function handleLogout() {
    await api.signOut(session.token);
    setSession(null); setProducts([]); setMovements([]);
  }

  const filtered = useMemo(()=>products.filter(p=>{
    const q=search.toLowerCase();
    return (p.name.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q))
      &&(category==="Todas"||p.category===category)
      &&(statusFilt==="Todos"||getStatus(p.stock,p.min)===statusFilt);
  }),[products,search,category,statusFilt]);

  const stats = useMemo(()=>({
    total:products.length,
    ok:products.filter(p=>getStatus(p.stock,p.min)==="ok").length,
    low:products.filter(p=>getStatus(p.stock,p.min)==="low").length,
    out:products.filter(p=>getStatus(p.stock,p.min)==="out").length,
  }),[products]);

  async function applyMove(product, type, qty) {
    setSaving(true);
    const newStock = Math.max(0, product.stock+(type==="entrada"?qty:-qty));
    try {
      await api.patch("products",product.id,{stock:newStock},session.token);
      await api.post("movements",{
        product_id:product.id, sku:product.sku, product_name:product.name,
        type, qty, user_id:session.userId, user_name:session.profile.full_name
      },session.token);
      await loadData();
      showToast(`${type==="entrada"?"▲":"▼"} ${qty} ${product.unit} — ${product.name}`);
    } catch { showToast("Error al guardar",C.out); }
    setSaving(false);
  }

  function handleScan(raw) {
    setModal(null);
    let sku; try { sku=JSON.parse(raw).sku; } catch { sku=raw.trim(); }
    const found=products.find(p=>p.sku===sku);
    if(!found){ showToast(`SKU "${sku}" no encontrado`,C.out); return; }
    setScanTarget(found); setModal("scanmove");
  }

  function openAdd()   { if(!canManage) return; setForm({name:"",sku:"",category:"Electrónica",stock:"",min:"",unit:"unidad"}); setModal("add"); }
  function openEdit(p) { if(!canManage) return; setSelected(p); setForm({...p}); setModal("edit"); }
  function openMove(p) { if(!canEdit)  return; setSelected(p); setMoveQty(""); setMoveType("entrada"); setModal("move"); }
  function openQR(p)   { setSelected(p); setModal("qr"); }

  async function saveAdd() {
    if(!form.name||!form.sku) return; setSaving(true);
    try {
      await api.post("products",{name:form.name,sku:form.sku,category:form.category,stock:+form.stock||0,min:+form.min||0,price:0,unit:form.unit||"unidad"},session.token);
      await loadData(); setModal(null); showToast("Producto añadido ✓");
    } catch { showToast("Error al guardar",C.out); }
    setSaving(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.patch("products",selected.id,{name:form.name,sku:form.sku,category:form.category,stock:+form.stock,min:+form.min,unit:form.unit},session.token);
      await loadData(); setModal(null); showToast("Producto actualizado ✓");
    } catch { showToast("Error al guardar",C.out); }
    setSaving(false);
  }

  async function saveMove() {
    const qty=parseInt(moveQty); if(!qty||qty<=0) return;
    await applyMove(selected,moveType,qty); setModal(null);
  }

  async function deleteProduct(id) {
    if(!canManage) return;
    if(!confirm("¿Eliminar este producto?")) return; setSaving(true);
    try { await api.del("products",id,session.token); await loadData(); showToast("Producto eliminado"); }
    catch { showToast("Error al eliminar",C.out); }
    setSaving(false);
  }

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 32px" }}>
        <div style={{ maxWidth:1300,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:64,gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:36,height:36,borderRadius:8,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" opacity=".9"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" opacity=".6"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" opacity=".6"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" opacity=".3"/></svg>
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:15,color:C.text }}>Control de Stock</div>
              <div style={{ fontSize:11,color:C.muted }}>Sista S.A.</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            {saving && <span style={{ fontSize:12,color:C.primary,animation:"pulse 1s infinite" }}>● Guardando…</span>}
            <div style={{ display:"flex",alignItems:"center",gap:8,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px" }}>
              <div style={{ width:28,height:28,borderRadius:"50%",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700 }}>
                {session.profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:12,fontWeight:600,color:C.text }}>{session.profile.full_name}</div>
                <div style={{ fontSize:10,color:ROLE_COLORS[role] }}>{ROLE_LABELS[role]}</div>
              </div>
            </div>
            {canEdit   && <Btn variant="scan" onClick={()=>setModal("scanner")}>▣ Escanear QR</Btn>}
            {canManage && <Btn variant="ghost" onClick={()=>setModal("users")}>👥 Usuarios</Btn>}
            {canManage && <Btn onClick={openAdd}>+ Nuevo producto</Btn>}
            <button onClick={handleLogout} style={{ background:"none",border:`1px solid ${C.border}`,color:C.muted,padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12 }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300,margin:"0 auto",padding:"28px 32px" }}>
        {loading?(
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:300,flexDirection:"column",gap:16 }}>
            <div style={{ width:36,height:36,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.primary}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
            <div style={{ color:C.muted,fontSize:13 }}>Cargando datos…</div>
          </div>
        ):(<>

          {/* Stats */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28 }}>
            {[
              {label:"Total productos",value:stats.total,icon:"📦",accent:C.primary},
              {label:"En stock",       value:stats.ok,   icon:"✅",accent:C.ok},
              {label:"Stock bajo",     value:stats.low,  icon:"⚠️",accent:C.low},
              {label:"Sin stock",      value:stats.out,  icon:"🚫",accent:C.out},
            ].map(s=>(
              <Card key={s.label} style={{ padding:"20px 24px",borderLeft:`4px solid ${s.accent}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={{ color:C.muted,fontSize:12,marginBottom:8,fontWeight:500 }}>{s.label}</div>
                    <div style={{ color:s.accent,fontSize:28,fontWeight:700,lineHeight:1 }}>{s.value}</div>
                  </div>
                  <span style={{ fontSize:22 }}>{s.icon}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card style={{ padding:"16px 20px",marginBottom:20,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
            <input placeholder="Buscar por nombre o SKU…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ flex:1,minWidth:200,background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 14px",color:C.text,fontSize:13,fontFamily:"inherit",outline:"none" }} />
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setCategory(c)} style={{ padding:"8px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:500,background:category===c?C.primary:C.bg,color:category===c?"#fff":C.muted,border:category===c?"none":`1.5px solid ${C.border}`,transition:"all .15s" }}>{c}</button>
              ))}
            </div>
            <div style={{ display:"flex",gap:6 }}>
              {["Todos","ok","low","out"].map(s=>(
                <button key={s} onClick={()=>setStatusFilt(s)} style={{ padding:"8px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:500,background:statusFilt===s?C.primaryLt:"transparent",color:statusFilt===s?C.primary:C.muted,border:`1.5px solid ${statusFilt===s?C.primary:C.border}`,transition:"all .15s" }}>{s==="Todos"?"Todos":STATUS[s].label}</button>
              ))}
            </div>
          </Card>

          {/* Table */}
          <Card>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${C.borderLt}` }}>
                    {["QR","SKU","Producto","Categoría","Stock","Mín.","Estado","Acciones"].map(h=>(
                      <th key={h} style={{ padding:"13px 16px",textAlign:"left",color:C.muted,fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0?(
                    <tr><td colSpan={8} style={{ padding:48,textAlign:"center",color:C.muted,fontSize:14 }}>Sin resultados</td></tr>
                  ):filtered.map((p,i)=>{
                    const st=getStatus(p.stock,p.min);
                    return (
                      <tr key={p.id} style={{ borderBottom:`1px solid ${C.borderLt}`,background:i%2===0?"#fff":"#FDFBFF" }}>
                        <td style={{ padding:"10px 16px" }}>
                          <button onClick={()=>openQR(p)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",padding:4,lineHeight:0 }}>
                            <QRImg sku={p.sku} size={38} />
                          </button>
                        </td>
                        <td style={{ padding:"13px 16px",color:C.muted,fontSize:12,fontFamily:"monospace" }}>{p.sku}</td>
                        <td style={{ padding:"13px 16px",color:C.text,fontSize:14,fontWeight:600 }}>{p.name}</td>
                        <td style={{ padding:"13px 16px" }}><span style={{ background:C.primaryLt,color:C.primary,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:500 }}>{p.category}</span></td>
                        <td style={{ padding:"13px 16px" }}>
                          <span style={{ color:st==="out"?C.out:st==="low"?C.low:C.text,fontSize:18,fontWeight:700 }}>{p.stock}</span>
                          <span style={{ color:C.muted,fontSize:12,marginLeft:4 }}>{p.unit}</span>
                        </td>
                        <td style={{ padding:"13px 16px",color:C.muted,fontSize:13 }}>{p.min}</td>
                        <td style={{ padding:"13px 16px" }}><Badge status={st} /></td>
                        <td style={{ padding:"13px 16px" }}>
                          <div style={{ display:"flex",gap:6 }}>
                            {canEdit   && <button onClick={()=>openMove(p)} style={{ background:C.okBg,border:`1px solid ${C.ok}30`,color:C.ok,padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:600 }} title="Movimiento">⇅</button>}
                            {canManage && <button onClick={()=>openEdit(p)} style={{ background:C.primaryLt,border:`1px solid ${C.primary}30`,color:C.primary,padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:13 }} title="Editar">✎</button>}
                            {canManage && <button onClick={()=>deleteProduct(p.id)} style={{ background:C.outBg,border:`1px solid ${C.out}30`,color:C.out,padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:13 }} title="Eliminar">✕</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Movement log */}
          {movements.length>0&&(
            <div style={{ marginTop:24 }}>
              <div style={{ color:C.muted,fontSize:12,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12 }}>Últimos movimientos</div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {movements.slice(0,10).map(m=>(
                  <div key={m.id} style={{ background:m.type==="entrada"?C.okBg:C.outBg,border:`1px solid ${m.type==="entrada"?C.ok+"30":C.out+"30"}`,borderRadius:8,padding:"8px 14px",fontSize:12,display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ color:m.type==="entrada"?C.ok:C.out,fontWeight:700 }}>{m.type==="entrada"?"▲":"▼"} {m.qty}</span>
                    <span style={{ color:C.muted,fontSize:11,fontFamily:"monospace" }}>{m.sku}</span>
                    <span style={{ color:C.text }}>{m.product_name}</span>
                    {m.user_name && <span style={{ background:C.primaryLt,color:C.primary,padding:"1px 8px",borderRadius:20,fontSize:11,fontWeight:600 }}>{m.user_name}</span>}
                    <span style={{ color:C.muted,fontSize:11 }}>{new Date(m.created_at).toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>)}
      </div>

      {/* Modals */}
      {modal==="scanner"&&<Modal title="Escanear código QR" onClose={()=>setModal(null)}><QRScanner onScan={handleScan} onClose={()=>setModal(null)} /></Modal>}
      {modal==="users"&&<UserModal session={session} onClose={()=>setModal(null)} />}

      {modal==="scanmove"&&scanTarget&&(
        <Modal title="Movimiento rápido — QR" onClose={()=>{setModal(null);setScanTarget(null);}}>
          <div style={{ background:C.primaryLt,borderRadius:8,padding:"14px 18px",marginBottom:20 }}>
            <div style={{ color:C.primary,fontSize:11,fontWeight:700,marginBottom:4 }}>✓ QR escaneado</div>
            <div style={{ color:C.muted,fontSize:12 }}>{scanTarget.sku}</div>
            <div style={{ color:C.text,fontSize:16,fontWeight:700,marginTop:2 }}>{scanTarget.name}</div>
            <div style={{ color:C.primary,fontSize:24,fontWeight:800,marginTop:4 }}>Stock: {scanTarget.stock} {scanTarget.unit}</div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
            {["entrada","salida"].map(t=>(
              <button key={t} onClick={()=>setMoveType(t)} style={{ padding:"14px",borderRadius:8,cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:700,background:moveType===t?(t==="entrada"?C.okBg:C.outBg):"transparent",color:moveType===t?(t==="entrada"?C.ok:C.out):C.muted,border:`2px solid ${moveType===t?(t==="entrada"?C.ok:C.out):C.border}`,transition:"all .15s" }}>{t==="entrada"?"▲ Entrada":"▼ Salida"}</button>
            ))}
          </div>
          <Field label="Cantidad"><Input value={moveQty} onChange={e=>setMoveQty(e.target.value)} type="number" min="1" /></Field>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:8 }}>
            <Btn variant="ghost" onClick={()=>{setModal(null);setScanTarget(null);}}>Cancelar</Btn>
            <Btn onClick={async()=>{await applyMove(scanTarget,moveType,parseInt(moveQty)||1);setModal(null);setScanTarget(null);}} disabled={saving}>Confirmar</Btn>
          </div>
        </Modal>
      )}

      {modal==="qr"&&selected&&(
        <Modal title={`Código QR — ${selected.sku}`} onClose={()=>setModal(null)}>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:20 }}>
            <div style={{ background:"#fff",padding:20,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:`0 4px 20px ${C.primary}15` }}><QRImg sku={selected.sku} size={200} /></div>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:C.primary,fontSize:20,fontWeight:800 }}>{selected.sku}</div>
              <div style={{ color:C.text,fontSize:15,marginTop:4 }}>{selected.name}</div>
            </div>
            <Btn variant="outline" onClick={()=>window.print()}>🖨 Imprimir etiqueta</Btn>
          </div>
        </Modal>
      )}

      {modal==="add"&&(
        <Modal title="Nuevo producto" onClose={()=>setModal(null)}>
          <Field label="Nombre"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></Field>
          <Field label="SKU / Código"><Input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} /></Field>
          <Field label="Categoría"><Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} options={["Electrónica","Mobiliario","Papelería","Otro"]} /></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="Stock inicial"><Input value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} type="number" min="0" /></Field>
            <Field label="Stock mínimo"><Input  value={form.min}   onChange={e=>setForm(f=>({...f,min:e.target.value}))}   type="number" min="0" /></Field>
          </div>
          <Field label="Unidad"><Input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="unidad, caja, resma…" /></Field>
          <div style={{ display:"flex",gap:10,marginTop:8,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={saveAdd} disabled={saving}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {modal==="edit"&&(
        <Modal title={`Editar — ${selected?.sku}`} onClose={()=>setModal(null)}>
          <Field label="Nombre"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></Field>
          <Field label="SKU"><Input    value={form.sku}  onChange={e=>setForm(f=>({...f,sku:e.target.value}))} /></Field>
          <Field label="Categoría"><Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} options={["Electrónica","Mobiliario","Papelería","Otro"]} /></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="Stock"><Input       value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} type="number" min="0" /></Field>
            <Field label="Stock mínimo"><Input value={form.min}   onChange={e=>setForm(f=>({...f,min:e.target.value}))}   type="number" min="0" /></Field>
          </div>
          <Field label="Unidad"><Input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} /></Field>
          <div style={{ display:"flex",gap:10,marginTop:8,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={saveEdit} disabled={saving}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {modal==="move"&&selected&&(
        <Modal title="Movimiento de stock" onClose={()=>setModal(null)}>
          <div style={{ background:C.primaryLt,borderRadius:8,padding:"14px 18px",marginBottom:20 }}>
            <div style={{ color:C.muted,fontSize:12 }}>{selected.sku}</div>
            <div style={{ color:C.text,fontSize:15,fontWeight:700,marginTop:2 }}>{selected.name}</div>
            <div style={{ color:C.primary,fontSize:24,fontWeight:800,marginTop:4 }}>Stock: {selected.stock} {selected.unit}</div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
            {["entrada","salida"].map(t=>(
              <button key={t} onClick={()=>setMoveType(t)} style={{ padding:"14px",borderRadius:8,cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:700,background:moveType===t?(t==="entrada"?C.okBg:C.outBg):"transparent",color:moveType===t?(t==="entrada"?C.ok:C.out):C.muted,border:`2px solid ${moveType===t?(t==="entrada"?C.ok:C.out):C.border}`,transition:"all .15s" }}>{t==="entrada"?"▲ Entrada":"▼ Salida"}</button>
            ))}
          </div>
          <Field label="Cantidad"><Input value={moveQty} onChange={e=>setMoveQty(e.target.value)} type="number" min="1" /></Field>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:8 }}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={saveMove} disabled={saving}>Confirmar</Btn>
          </div>
        </Modal>
      )}

      {toast&&(
        <div style={{ position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",background:C.surface,border:`1px solid ${toast.color}30`,borderLeft:`4px solid ${toast.color}`,borderRadius:8,padding:"14px 24px",color:toast.color,fontSize:13,fontWeight:600,zIndex:300,boxShadow:"0 8px 32px #1A1A2E15",animation:"fadeup 0.25s ease" }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes fadeup  { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes scanline{ 0%{top:8%}50%{top:88%}100%{top:8%} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:.4} }
        *{ box-sizing:border-box; } body{ margin:0; }
        tr:hover td{ background:${C.primaryLt}22 !important; }
        ::-webkit-scrollbar{ width:6px; background:${C.bg}; }
        ::-webkit-scrollbar-thumb{ background:${C.border}; border-radius:3px; }
      `}</style>
    </div>
  );
}