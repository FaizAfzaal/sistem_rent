import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import api, { IMAGE_BASE } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ChevronLeft, ChevronRight, Wrench, Calendar, X, Info, Users, CheckCircle } from "lucide-react";

const COLORS = [
  { light:"bg-indigo-100", text:"text-indigo-700", border:"border-indigo-300", dot:"#6366f1" },
  { light:"bg-emerald-100",text:"text-emerald-700",border:"border-emerald-300",dot:"#10b981" },
  { light:"bg-rose-100",   text:"text-rose-700",   border:"border-rose-300",   dot:"#f43f5e" },
  { light:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-300",  dot:"#f59e0b" },
  { light:"bg-violet-100", text:"text-violet-700", border:"border-violet-300", dot:"#8b5cf6" },
  { light:"bg-cyan-100",   text:"text-cyan-700",   border:"border-cyan-300",   dot:"#06b6d4" },
  { light:"bg-orange-100", text:"text-orange-700", border:"border-orange-300", dot:"#f97316" },
  { light:"bg-pink-100",   text:"text-pink-700",   border:"border-pink-300",   dot:"#ec4899" },
  { light:"bg-teal-100",   text:"text-teal-700",   border:"border-teal-300",   dot:"#14b8a6" },
  { light:"bg-lime-100",   text:"text-lime-700",   border:"border-lime-300",   dot:"#65a30d" },
];
const DAYS=["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const MONTHS=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const toLocal=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);};
const pad=n=>String(n).padStart(2,"0");
const mkKey=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;

export default function KalenderPage(){
  const{isAdmin}=useAuth();
  const now=new Date();
  const[year,setYear]=useState(now.getFullYear());
  const[month,setMonth]=useState(now.getMonth());
  const[alat,setAlat]=useState([]);
  const[bookings,setBookings]=useState([]);
  const[kategori,setKategori]=useState([]);
  const[loading,setLoading]=useState(true);
  const[filterAlat,setFilterAlat]=useState("");
  const[filterKat,setFilterKat]=useState("");
  const[selectedDay,setSelectedDay]=useState(null);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    Promise.all([
      api.get("/alat?size=200"),
      api.get("/kategori-alat?size=100"),
      api.get(`/bookings/kalender?bulan=${month+1}&tahun=${year}`),
    ]).then(([aRes,kRes,bRes])=>{
      if(cancelled)return;
      setAlat(aRes.data.data||[]);
      setKategori(kRes.data.data||[]);
      setBookings(bRes.data.data||[]);
    }).catch(()=>{if(!cancelled)setBookings([]);})
    .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[year,month]);

  const colorMap=useMemo(()=>{const m={};bookings.forEach((b,i)=>{m[b.id]=COLORS[i%COLORS.length];});return m;},[bookings]);
  const filteredAlat=useMemo(()=>{let l=alat;if(filterKat)l=l.filter(a=>String(a.kategori_id)===filterKat);if(filterAlat)l=l.filter(a=>a.id===parseInt(filterAlat));return l;},[alat,filterKat,filterAlat]);
  const alatBookingMap=useMemo(()=>{
    const map={};
    const first=new Date(year,month,1),last=new Date(year,month+1,0);
    bookings.forEach(b=>{
      const s=toLocal(b.tanggal_mulai),e=toLocal(b.tanggal_selesai);
      if(s>last||e<first)return;
      b.details?.forEach(d=>{if(!map[d.alat_id])map[d.alat_id]=[];if(!map[d.alat_id].find(x=>x.id===b.id))map[d.alat_id].push(b);});
    });
    return map;
  },[bookings,year,month]);
  const calDays=useMemo(()=>{const fd=new Date(year,month,1).getDay(),dim=new Date(year,month+1,0).getDate(),c=Array(fd).fill(null);for(let d=1;d<=dim;d++)c.push(d);while(c.length%7!==0)c.push(null);return c;},[year,month]);
  const prevMonth=()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1);
  const nextMonth=()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1);
  const goToday=()=>{setYear(now.getFullYear());setMonth(now.getMonth());};
  const isToday=d=>d&&year===now.getFullYear()&&month===now.getMonth()&&d===now.getDate();
  const getBookingsOn=(alatId,day)=>{if(!day)return[];const dt=toLocal(mkKey(year,month,day));return(alatBookingMap[alatId]||[]).filter(b=>dt>=toLocal(b.tanggal_mulai)&&dt<=toLocal(b.tanggal_selesai));};
  const getQty=(alatId,day)=>getBookingsOn(alatId,day).reduce((s,b)=>s+(b.details?.find(d=>d.alat_id===alatId)?.qty||1),0);
  const isMyBooking=b=>!isAdmin&&b.is_mine===true;
  const handleDayClick=(alatItem,day)=>{if(!day)return;const bk=getBookingsOn(alatItem.id,day),qty=getQty(alatItem.id,day);setSelectedDay({date:`${day} ${MONTHS[month]} ${year}`,alat:alatItem,bookings:bk,stokTerpakai:qty,stokTersedia:Math.max(0,alatItem.stok-qty)});};
  const thisMonth=Object.values(alatBookingMap).flat().filter((b,i,a)=>a.findIndex(x=>x.id===b.id)===i);

  if(loading)return(<AppLayout><div className="flex items-center justify-center py-24"><div className="text-center"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"/><p className="text-gray-500 font-medium">Memuat kalender...</p></div></div></AppLayout>);

  return(
    <AppLayout>
      <div className="animate-fade-in space-y-5">
        <div><h1 className="page-title flex items-center gap-2"><Calendar className="h-6 w-6 text-indigo-600"/>Kalender Ketersediaan Alat</h1><p className="page-subtitle">Jadwal pemakaian alat — tiap warna mewakili booking berbeda.{!isAdmin&&" Nama pemesan disembunyikan."}</p></div>
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"><ChevronLeft className="h-4 w-4 text-gray-700"/></button>
            <span className="text-sm font-bold text-gray-900 w-40 text-center">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"><ChevronRight className="h-4 w-4 text-gray-700"/></button>
          </div>
          <button onClick={goToday} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">Hari Ini</button>
          <div className="flex-1"/>
          <select className="input-field w-44 text-sm py-2" value={filterKat} onChange={e=>{setFilterKat(e.target.value);setFilterAlat("");}}>
            <option value="">Semua Kategori</option>{kategori.map(k=><option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
          </select>
          <select className="input-field w-52 text-sm py-2" value={filterAlat} onChange={e=>setFilterAlat(e.target.value)}>
            <option value="">Semua Alat</option>{alat.filter(a=>!filterKat||String(a.kategori_id)===filterKat).map(a=><option key={a.id} value={a.id}>{a.nama_alat}</option>)}
          </select>
        </div>
        {thisMonth.length>0&&(<div className="card p-4"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Legenda Booking Bulan Ini</p><div className="flex flex-wrap gap-2">{thisMonth.map(b=>{const c=colorMap[b.id],mine=isMyBooking(b);return(<div key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${c?.light} ${c?.border}`}><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:c?.dot}}/><span className={`font-bold ${c?.text}`}>{b.kode_booking}</span><span className="text-gray-500">{new Date(b.tanggal_mulai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})} - {new Date(b.tanggal_selesai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</span>{mine&&<span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold">Saya</span>}<span className={`badge-${b.status} text-[10px]`}>{b.status}</span></div>);})}</div></div>)}
        {filteredAlat.length===0?(<div className="card text-center py-14"><Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3"/><p className="text-gray-500 font-medium">Tidak ada alat ditemukan</p></div>):filteredAlat.map(alatItem=>{
          const bFor=alatBookingMap[alatItem.id]||[];
          return(<div key={alatItem.id} className="card p-0 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">{alatItem.gambar?<img src={`${IMAGE_BASE}/${alatItem.gambar}`} alt={alatItem.nama_alat} className="w-full h-full object-cover"/>:<Wrench className="h-5 w-5 text-gray-400"/>}</div>
              <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900">{alatItem.nama_alat}</h3><p className="text-xs text-gray-500 mt-0.5">{alatItem.kategori?.nama_kategori}{alatItem.merek ? ` · ${alatItem.merek}` : ''} · {alatItem.kode_alat} · Stok: {alatItem.stok} unit</p></div>
              <div className="flex-shrink-0">{bFor.length>0?<span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">{bFor.length} booking bulan ini</span>:<span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3"/>Bebas bulan ini</span>}</div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-7 mb-1">{DAYS.map((d,i)=><div key={d} className={`text-center text-xs font-bold py-2 ${i===0?"text-red-500":i===6?"text-blue-500":"text-gray-400"}`}>{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">{calDays.map((day,idx)=>{
                if(!day)return<div key={idx} className="min-h-[52px]"/>;
                const bk=getBookingsOn(alatItem.id,day),qty=getQty(alatItem.id,day),sisa=Math.max(0,alatItem.stok-qty),habis=sisa===0&&alatItem.stok>0&&bk.length>0,hasBk=bk.length>0,today=isToday(day),dow=idx%7,c0=bk[0]?colorMap[bk[0].id]:null,dk=mkKey(year,month,day),isStart=bk.some(b=>b.tanggal_mulai===dk),isEnd=bk.some(b=>b.tanggal_selesai===dk),mine=bk.some(b=>isMyBooking(b));
                return(<div key={idx} onClick={()=>hasBk&&handleDayClick(alatItem,day)} className={["relative min-h-[52px] rounded-xl p-1.5 flex flex-col gap-0.5 border transition-all duration-150",hasBk?"cursor-pointer":"cursor-default",today?"ring-2 ring-indigo-600 ring-offset-1":"",habis?"bg-red-50 border-red-200 hover:bg-red-100":hasBk?`${c0?.light} ${c0?.border} hover:opacity-80`:"bg-white border-gray-100 hover:bg-slate-50 hover:border-slate-200"].join(" ")}>
                  <div className={["w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold self-start",today?"bg-indigo-600 text-white":habis?"text-red-600":hasBk?c0?.text:dow===0?"text-red-400":dow===6?"text-blue-500":"text-gray-700"].join(" ")}>{day}</div>
                  {hasBk&&<div className={["text-[9px] font-bold leading-none px-1 py-0.5 rounded w-fit",habis?"bg-red-200 text-red-700":`bg-white/70 ${c0?.text}`].join(" ")}>sisa {sisa}</div>}
                  {bk.length>0&&<div className="flex flex-wrap gap-0.5">{bk.slice(0,4).map(b=><div key={b.id} className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:colorMap[b.id]?.dot}}/>)}{bk.length>4&&<span className="text-[8px] text-gray-500">+{bk.length-4}</span>}</div>}
                  {isStart&&<div className="absolute top-1 right-1.5 text-[8px] font-black" style={{color:c0?.dot}}>▶</div>}
                  {isEnd&&!isStart&&<div className="absolute top-1 right-1.5 text-[8px] font-black" style={{color:c0?.dot}}>◀</div>}
                  {mine&&<div className="absolute bottom-1 right-1 w-2 h-2 bg-indigo-600 rounded-full ring-1 ring-white"/>}
                </div>);
              })}</div>
              {bFor.length>0&&(<div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Booking aktif bulan ini</p><div className="flex flex-wrap gap-2">{bFor.map(b=>{const c=colorMap[b.id],mine=isMyBooking(b),det=b.details?.find(d=>d.alat_id===alatItem.id);return(<div key={b.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${c?.light} ${c?.border}`}><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:c?.dot}}/><div className="text-xs"><span className={`font-bold ${c?.text}`}>{b.kode_booking}</span><span className="text-gray-500 mx-1">{new Date(b.tanggal_mulai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})} - {new Date(b.tanggal_selesai).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</span>{det&&<span className="text-gray-400">· {det.qty} unit</span>}</div>{mine&&<span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">Saya</span>}<span className={`badge-${b.status} text-[10px]`}>{b.status}</span>{isAdmin&&b.user?.nama&&<span className="text-gray-400 text-xs">· {b.user.nama}</span>}</div>);})}</div></div>)}
            </div>
          </div>);
        })}
        {selectedDay&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setSelectedDay(null)}/><div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-slide-up overflow-hidden"><div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-5"><div className="flex items-start justify-between mb-4"><div><p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">{selectedDay.alat?.nama_alat}</p><h3 className="text-white font-bold text-xl mt-0.5">{selectedDay.date}</h3></div><button onClick={()=>setSelectedDay(null)} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"><X className="h-4 w-4 text-white"/></button></div><div className="grid grid-cols-3 gap-2">{[["Total Stok",selectedDay.alat?.stok,"bg-white/15"],["Terpakai",selectedDay.stokTerpakai,"bg-white/15"],["Tersedia",selectedDay.stokTersedia,selectedDay.stokTersedia===0?"bg-red-500/40":"bg-emerald-500/30"]].map(([label,val,cls])=>(<div key={label} className={`${cls} rounded-xl p-3 text-center`}><p className="text-white/70 text-[10px] font-semibold uppercase">{label}</p><p className="text-white font-bold text-xl">{val}</p></div>))}</div></div><div className="p-5 space-y-3 max-h-72 overflow-y-auto">{selectedDay.bookings.length===0?(<div className="text-center py-6"><CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2"/><p className="text-gray-600 font-medium">Tidak ada booking</p></div>):selectedDay.bookings.map(b=>{const c=colorMap[b.id],mine=isMyBooking(b),det=b.details?.find(d=>d.alat_id===selectedDay.alat?.id);return(<div key={b.id} className={`p-4 rounded-xl border-2 ${c?.light} ${c?.border}`}><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:c?.dot}}/><span className={`font-bold text-sm ${c?.text}`}>{b.kode_booking}</span>{mine&&<span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">Saya</span>}</div><span className={`badge-${b.status}`}>{b.status}</span></div><div className="space-y-1 text-xs text-gray-600"><div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-gray-400"/>{new Date(b.tanggal_mulai).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})} - {new Date(b.tanggal_selesai).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</div>{det&&<div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-gray-400"/>{det.qty} unit dipinjam</div>}{isAdmin&&b.user?.nama&&<div className="flex items-center gap-2"><span className="text-gray-400">👤</span>{b.user.nama}</div>}{mine&&b.user?.nama&&<div className="flex items-center gap-2"><span className="text-gray-400">👤</span>{b.user.nama} (Anda)</div>}{b.total_harga && !isNaN(Number(b.total_harga)) && Number(b.total_harga) > 0 && (<div className="flex items-center gap-2"><span className="text-gray-400">💰</span><span className="font-semibold">Rp {Number(b.total_harga).toLocaleString("id-ID")}</span></div>)}</div></div>);})}</div><div className="px-5 pb-5"><div className="bg-slate-50 rounded-xl p-3 flex gap-2"><Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5"/><p className="text-xs text-slate-500">{selectedDay.stokTersedia>0?`Masih ada ${selectedDay.stokTersedia} unit tersedia. Anda bisa booking tanggal ini.`:"Semua unit sudah habis dipesan. Coba pilih tanggal lain."}</p></div></div></div></div>)}
      </div>
    </AppLayout>
  );
}