import{M as i,al as o}from"./index-f216e3d5.js";function a(r,n=!1){const e=`
  <svg xmlns="http://www.w3.org/2000/svg" class="preloader-circular" viewBox="25 25 50 50">
  <circle class="preloader-path" cx="50" cy="50" r="20" fill="none" stroke-miterlimit="10"/>
  </svg>`;if(n){const t=document.createElement("div");return t.classList.add("preloader"),t.innerHTML=e,r&&r.appendChild(t),t}return r.insertAdjacentHTML("beforeend",e),r.lastElementChild}i.putPreloader=a;function c(r,n="check"){const e=r.querySelector(`.${o(n)}`);return e?.remove(),r.disabled=!0,a(r),()=>{r.replaceChildren(),e&&r.append(e),r.removeAttribute("disabled")}}export{a as p,c as s};
//# sourceMappingURL=putPreloader-4abf94a8.js.map
