(() => {
 const C=window.MALAEBI_CONFIG||{}, base=(C.API_BASE_URL||'').replace(/\/$/,'');
 const accessKey='malaebi_access_token', refreshKey='malaebi_refresh_token';
 async function raw(path,options={},token=null){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  if(token) headers.Authorization=`Bearer ${token}`;
  const response=await fetch(base+path,{...options,headers});
  const body=response.status===204?null:await response.json().catch(()=>null);
  return {response,body};
 }
 async function request(path,options={}) {
  if(!base) throw new Error('عنوان API غير مضبوط في config.js');
  let token=localStorage.getItem(accessKey);
  let {response,body}=await raw(path,options,token);
  if(response.status===401 && localStorage.getItem(refreshKey) && !path.startsWith('/auth/')){
   const refreshed=await raw('/auth/refresh',{method:'POST',body:JSON.stringify({refresh_token:localStorage.getItem(refreshKey)})});
   if(refreshed.response.ok && refreshed.body?.access_token){
    saveSession(refreshed.body);token=refreshed.body.access_token;
    ({response,body}=await raw(path,options,token));
   }else clearSession();
  }
  if(!response.ok) throw new Error(body?.message||`API error ${response.status}`);
  return body;
 }
 function saveSession(r){localStorage.setItem(accessKey,r.access_token);if(r.refresh_token)localStorage.setItem(refreshKey,r.refresh_token)}
 function clearSession(){localStorage.removeItem(accessKey);localStorage.removeItem(refreshKey)}
 window.MalaebiAPI={
  enabled:()=>!C.DEMO_MODE&&!!base,
  register:async(fullName,email,password)=>{const r=await request('/auth/register',{method:'POST',body:JSON.stringify({full_name:fullName,email,password})});if(r?.access_token)saveSession(r);return r;},
  login:async(email,password)=>{const r=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});if(r?.access_token)saveSession(r);return r;},
  verifyEmailOtp:async(email,code)=>{const r=await request('/auth/email/verify',{method:'POST',body:JSON.stringify({email,code})});if(r?.access_token)saveSession(r);return r;},
  resendEmailOtp:email=>request('/auth/email/resend',{method:'POST',body:JSON.stringify({email})}),
  me:()=>request('/me'),
  updateProfile:data=>request('/me',{method:'PATCH',body:JSON.stringify(data)}),
  requestOtp:phone=>request('/auth/otp/request',{method:'POST',body:JSON.stringify({phone})}),
  verifyOtp:async(phone,code)=>{const r=await request('/auth/otp/verify',{method:'POST',body:JSON.stringify({phone,code})});saveSession(r);return r;},
  venues:async()=>{const r=await request('/venues');return r.data||[];},
  venueReviews:id=>request(`/venues/${encodeURIComponent(id)}/reviews`),
  fields:id=>request(`/venues/${encodeURIComponent(id)}/fields`),
  availability:(id,date)=>request(`/fields/${encodeURIComponent(id)}/availability?date=${encodeURIComponent(date)}`),
  createBooking:(fieldId,startsAt)=>request('/bookings',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({field_id:fieldId,starts_at:startsAt})}),
  myBookings:()=>request('/bookings/mine'),
  notifications:()=>request('/notifications'),
  bookingDetail:id=>request(`/bookings/${encodeURIComponent(id)}`),
  cancelBooking:id=>request(`/bookings/${encodeURIComponent(id)}/cancel`,{method:'POST'}),
  review:(id,rating,comment)=>request(`/bookings/${encodeURIComponent(id)}/reviews`,{method:'POST',body:JSON.stringify({rating,comment})}),
  logout:async()=>{try{let token=localStorage.getItem(accessKey);if(!token)return;let r=await raw('/auth/logout',{method:'POST'},token);if(r.response.status===401&&localStorage.getItem(refreshKey)){const fresh=await raw('/auth/refresh',{method:'POST',body:JSON.stringify({refresh_token:localStorage.getItem(refreshKey)})});if(fresh.response.ok&&fresh.body?.access_token){saveSession(fresh.body);r=await raw('/auth/logout',{method:'POST'},fresh.body.access_token)}}if(!r.response.ok)throw new Error(r.body?.message||'تعذر إنهاء الجلسة')}finally{clearSession()}}
 };
})();
