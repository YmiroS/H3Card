import{reactExports as v,jsxRuntimeExports as t}from"./http-CceZLADw.js";import{Color as ze,ShaderMaterial as oe,DoubleSide as ue,Vector3 as N,AdditiveBlending as Re,BackSide as We,Vector2 as Ce,WebGLRenderer as Ie,SRGBColorSpace as _e,ACESFilmicToneMapping as Ee,Scene as Te,Group as be,Mesh as ne,SphereGeometry as Me,LineLoop as He,BufferGeometry as De,ConeGeometry as Ae,Matrix4 as Be,MeshStandardMaterial as Ve,PlaneGeometry as Fe,MeshBasicMaterial as Ge,LineSegments as ke,EdgesGeometry as Oe,LineBasicMaterial as Ue,AmbientLight as qe,PointLight as $e,PerspectiveCamera as Xe,OrthographicCamera as Ye,Raycaster as Ke,loadLightingImage as Je,Texture as Qe}from"./lightingImage-B2PF9mE0.js";import{createRuntimeScope as Ze}from"./main-W2iIpnhe.js";import{DEFAULT_LIGHTING as Se,lightingVector as Pe,lightingAngles as et,normalizeLighting as J,LIGHTING_PRESETS as tt}from"./CanvasPage-BSGkduTn.js";import"./monitor-alerts-1i8z99sD.js";import"./skills-CkT5s0qX.js";import"./videoComparisonTabs-tY4i9XAH.js";import"./usePageRuntime-CstfQlkN.js";const de=`
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;function it(){const i={lightPosition:{value:new N(0,0,1)},lightColor:{value:new ze("#ffffff")},strength:{value:1},ambient:{value:.38}},s={value:null},o={value:new N},a={value:new N},d={value:new Ce},p=new oe({name:"lighting-shell",uniforms:i,vertexShader:de,fragmentShader:`
      uniform vec3 lightPosition;
      uniform vec3 lightColor;
      uniform float strength;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 eye = isOrthographic
          ? vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
          : normalize(cameraPosition - vWorldPosition);
        vec3 incident = normalize(lightPosition * 2.8 - vWorldPosition);
        float rim = pow(1.0 - abs(dot(normal, eye)), 2.3);
        float diffuse = max(dot(normal, incident), 0.0);
        float gloss = pow(max(dot(normal, normalize(incident + eye)), 0.0), 36.0);
        float power = min(strength, 2.0);
        vec3 tint = vec3(0.22, 0.235, 0.25) + lightColor * power * (0.12 * diffuse + 0.22 * gloss);
        float alpha = 0.045 + 0.20 * rim + 0.035 * diffuse * power;
        if (!gl_FrontFacing) alpha *= 0.45;
        gl_FragColor = vec4(tint, alpha);
        #include <colorspace_fragment>
      }
    `,transparent:!0,depthWrite:!1,side:ue,toneMapped:!1}),w=new oe({name:"lighting-grid",vertexShader:de,fragmentShader:`
      varying vec3 vWorldPosition;
      void main() {
        vec3 eye = isOrthographic
          ? vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
          : normalize(cameraPosition - vWorldPosition);
        float facing = dot(normalize(vWorldPosition), eye);
        float alpha = mix(0.035, 0.16, smoothstep(-0.25, 0.5, facing));
        gl_FragColor = vec4(vec3(0.47, 0.49, 0.52), alpha);
        #include <colorspace_fragment>
      }
    `,transparent:!0,depthWrite:!1,toneMapped:!1}),f=new oe({name:"lighting-beam",uniforms:{lightColor:i.lightColor,strength:i.strength,beamCamera:o,beamViewDirection:a,imageHalfSize:d},vertexShader:`
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      void main() {
        vLocalPosition = position;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform vec3 lightColor;
      uniform float strength;
      uniform vec3 beamCamera;
      uniform vec3 beamViewDirection;
      uniform vec2 imageHalfSize;
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      void main() {
        // The beam is a rig overlay, not image illumination; keep it off the source quad.
        vec3 worldRay = isOrthographic
          ? vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
          : normalize(cameraPosition - vWorldPosition);
        if (imageHalfSize.x > 0.0 && abs(worldRay.z) > 0.00001) {
          vec3 imageHit = vWorldPosition - worldRay * (vWorldPosition.z / worldRay.z);
          if (abs(imageHit.x) < imageHalfSize.x && abs(imageHit.y) < imageHalfSize.y) discard;
        }
        vec3 toEye = beamCamera - vLocalPosition;
        float distanceToEye = length(toEye);
        vec3 direction = isOrthographic
          ? beamViewDirection
          : toEye / max(distanceToEye, 0.0001);
        float stepLength = min(distanceToEye, 2.3) / 32.0;
        float density = 0.0;
        // Integrate the cone volume, rather than drawing an opaque triangular surface.
        for (int i = 0; i < 32; i++) {
          vec3 samplePoint = vLocalPosition + direction * (float(i) + 0.5) * stepLength;
          float depth = -samplePoint.y;
          if (depth > 0.0 && depth < 1.0) {
            float radius = max(depth * 0.55, 0.0001);
            float radial = length(samplePoint.xz) / radius;
            float feather = 1.0 - smoothstep(0.35, 1.0, radial);
            float sourceFalloff = 1.0 / (0.35 + depth * depth);
            density += feather * sourceFalloff * stepLength;
          }
        }
        float alpha = 1.0 - exp(-density * strength * 1.6);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(lightColor, alpha * 0.65);
        #include <colorspace_fragment>
      }
    `,transparent:!0,depthWrite:!1,side:We,blending:Re,toneMapped:!1}),m=new oe({name:"lighting-image",uniforms:{...i,source:s},vertexShader:de,fragmentShader:`
      uniform sampler2D source;
      uniform vec3 lightPosition;
      uniform vec3 lightColor;
      uniform float strength;
      uniform float ambient;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vec4 original = texture2D(source, vUv);
        vec3 fromLight = vWorldPosition - lightPosition;
        float distanceSquared = max(dot(fromLight, fromLight), 0.12);
        vec3 ray = fromLight * inversesqrt(distanceSquared);
        vec3 axis = normalize(-lightPosition);
        float spot = smoothstep(0.876, 0.97, dot(ray, axis));
        vec3 normal = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        float diffuse = max(dot(normal, -ray), 0.0);
        float irradiance = spot * (diffuse + 0.12) / distanceSquared;
        vec3 illumination = vec3(ambient) + lightColor * strength * irradiance * 1.45;
        gl_FragColor = vec4(original.rgb * illumination, original.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,side:ue});return{shell:p,grid:w,beam:f,image:m,light:i,source:s,beamCamera:o,beamViewDirection:a,imageHalfSize:d}}function ot(i,s,o){if(typeof WebGL2RenderingContext>"u"||typeof ResizeObserver>"u")throw new Error("WebGL 不可用");const a=Ze();try{const d=new Ie({canvas:i,alpha:!0,antialias:!0});a.onDispose(()=>d.dispose()),d.setPixelRatio(Math.min(a.nativeWindow.devicePixelRatio||1,2)),d.outputColorSpace=_e,d.toneMapping=Ee;const p=new Te,w=[],f=[],m=e=>(w.push(e),e),u=e=>(f.push(e),e);a.onDispose(()=>{w.forEach(e=>e.dispose()),f.forEach(e=>e.dispose()),p.clear()});const l=it(),b=new be;p.add(b);const V=new ne(m(new Me(1,64,48)),u(l.shell));V.renderOrder=2;const T=new be;T.renderOrder=3;const F=u(l.grid),j=e=>{const r=Array.from({length:96},(h,y)=>e(y/96*Math.PI*2));T.add(new He(m(new De().setFromPoints(r)),F))};for(const e of[-60,-30,0,30,60]){const r=Math.sin(e*Math.PI/180)*1.003,h=Math.cos(e*Math.PI/180)*1.003;j(y=>new N(Math.sin(y)*h,r,Math.cos(y)*h))}for(const e of[0,30,60,90,120,150]){const r=e*Math.PI/180;j(h=>new N(Math.sin(r)*Math.cos(h)*1.003,Math.sin(h)*1.003,Math.cos(r)*Math.cos(h)*1.003))}b.add(V,T);const x=new ne(m(new Ae(.55,1,64).translate(0,-.5,0)),u(l.beam));x.name="lighting-beam",x.renderOrder=1,b.add(x);const re=new N(0,-1,0),Q=new N,P=new Be,C=u(new Ve({color:"#ffffff",emissive:"#ffffff",emissiveIntensity:.25,roughness:.22,metalness:.25,depthTest:!1})),_=new ne(m(new Me(.045,16,12)),C);_.renderOrder=4,b.add(_);const n=m(new Fe(1,1)),G=u(l.image),L=u(new Ge({color:"#ffffff",side:ue,toneMapped:!1})),M=new ne(n,G);M.name="lighting-image",M.visible=!1,p.add(M);const k=new ke(m(new Oe(n)),u(new Ue({color:"#98a5b7",transparent:!0,opacity:.65})));k.visible=!1,b.add(k);const he=new qe("#ffffff",.65),Z=new $e("#ffffff",1,0,0);p.add(he,Z);const H=new Xe(38,1,.1,30),S=new Ye(-1.3,1.3,1.3,-1.3,.1,30);S.position.set(0,0,4),S.lookAt(0,0,0);let z="perspective",O=-28,U=14,W={...Se},q=!1,I=!1,ae=null,ee=1,te=1,se=null,le=null,E=null,$=!1;const X=()=>I||z==="front"?S:H,pe=()=>{const e=Pe(O,U);H.position.set(e.x*4,e.y*4,e.z*4),H.lookAt(0,0,0),H.updateMatrixWorld(),S.updateMatrixWorld()},je=()=>{if(ae=null,!(a.disposed||$))try{pe(),p.updateMatrixWorld(!0),l.beamCamera.value.copy(X().position),x.worldToLocal(l.beamCamera.value),X().getWorldDirection(l.beamViewDirection.value).negate(),l.beamViewDirection.value.transformDirection(P.copy(x.matrixWorld).invert()),d.render(p,X());const e=_.position.clone().project(X());s.style.left=`${(e.x+1)*ee/2}px`,s.style.top=`${(1-e.y)*te/2}px`,s.style.visibility=I?"hidden":"visible",i.dataset.viewYaw=String(I||z==="front"?0:O),i.dataset.viewElevation=String(I||z==="front"?0:U),i.dataset.view=I?"original":z}catch{$=!0,s.style.visibility="hidden",o.onUnavailable()}},R=()=>{!a.disposed&&!$&&ae===null&&(ae=a.requestAnimationFrame(je))},Y=e=>{i.dataset.azimuth=String(e.light_azimuth),i.dataset.elevation=String(e.light_elevation),s.style.setProperty("--lighting-light-color",e.light_color_hex);const r=Pe(e.light_azimuth,e.light_elevation);_.position.set(r.x,r.y,r.z),C.color.set(e.light_color_hex),C.emissive.set(e.light_color_hex),x.position.copy(_.position),Q.copy(_.position).negate().normalize(),x.quaternion.setFromUnitVectors(re,Q);const h=e.light_intensity<3?1:e.light_intensity<7?2:3;l.light.lightPosition.value.copy(_.position),l.light.lightColor.value.set(e.light_color_hex),l.light.strength.value=h,l.light.ambient.value=e.cinematic_mode?.38:.62,Z.position.copy(_.position).multiplyScalar(2.8),Z.color.set(e.light_color_hex),Z.intensity=2+h,he.intensity=1.2,R()},ge=()=>{const e=i.getBoundingClientRect();ee=Math.max(1,e.width),te=Math.max(1,e.height),d.setSize(ee,te,!1);const r=ee/te;H.aspect=r,H.updateProjectionMatrix(),S.left=-1.3*Math.max(1,r),S.right=1.3*Math.max(1,r),S.top=1.3*Math.max(1,1/r),S.bottom=-S.top,S.updateProjectionMatrix(),R()};new a.ResizeObserver(ge).observe(i);const ie=new Ke,fe=new Ce;let g=null;const ve=e=>{const r=i.getBoundingClientRect();fe.set((e.clientX-r.left)/Math.max(1,r.width)*2-1,-(e.clientY-r.top)/Math.max(1,r.height)*2+1),pe(),p.updateMatrixWorld(!0),ie.setFromCamera(fe,X())},ce=()=>{const e=g;return g=null,e&&i.hasPointerCapture(e.pointerId)&&i.releasePointerCapture(e.pointerId),e},we=e=>{if(e.button!==0||g||I||$)return;ve(e);const r=e.currentTarget===s||ie.intersectObject(_).length>0;r&&q||(e.preventDefault(),g={pointerId:e.pointerId,kind:r?"light":"orbit",x:e.clientX,y:e.clientY,yaw:O,pitch:U,draft:{...W},moved:!1},i.setPointerCapture(e.pointerId))},Le=e=>{if(!g||g.pointerId!==e.pointerId)return;const r=e.clientX-g.x,h=e.clientY-g.y;if(!(Math.hypot(r,h)<2&&!g.moved)){if(g.moved=!0,g.kind==="orbit")z!=="perspective"&&o.onViewChange("perspective"),z="perspective",O=g.yaw-r*.45,U=Math.max(-85,Math.min(85,g.pitch+h*.45)),R();else if(!q){ve(e);const y=ie.intersectObject(V),K=_.position;let B;for(const ye of y)(!B||ye.point.distanceToSquared(K)<B.distanceToSquared(K))&&(B=ye.point);B||(B=ie.ray.closestPointToPoint(new N,new N).normalize()),g.draft={...W,...et(B)},Y(g.draft),o.onPreview(g.draft)}}},Ne=e=>{if(g?.pointerId!==e.pointerId)return;const r=ce();r?.kind==="light"&&(Y(W),o.onPreview(null),!q&&r.moved&&o.onChange(r.draft))},D=()=>{const e=ce();Y(W),e?.kind==="light"&&o.onPreview(null)},A=(e,r,h)=>{e.addEventListener(r,h,{signal:a.signal})};A(i,"pointerdown",we),A(s,"pointerdown",we),A(i,"pointermove",Le),A(i,"pointerup",Ne),A(i,"pointercancel",D),A(i,"lostpointercapture",D),i.addEventListener("webglcontextlost",e=>{e.preventDefault(),$=!0,s.style.visibility="hidden",o.onUnavailable()},{signal:a.signal});const xe=()=>{M.visible=!1,k.visible=!1,l.source.value=null,l.imageHalfSize.value.set(0,0),L.map=null,E?.dispose(),E=null,le?.dispose(),le=null};return a.onDispose(()=>{ce(),se?.abort(),xe(),s.style.visibility="hidden"}),Y(W),ge(),{update(e,r){W={...e},q=r,q&&g?.kind==="light"&&D(),g?.kind!=="light"&&Y(W)},setView(e){D(),z=e,R()},resetView(){D(),z="perspective",O=-28,U=14,R()},setCompare(e){D(),I=e,b.visible=!e,M.material=e?L:G,R()},setImage(e,r){if(se?.abort(),xe(),R(),!e){o.onImageStatus("请先选择原图；仍可设置灯光参数");return}const h=new AbortController;se=h,o.onImageStatus("正在载入原图…"),Je(e,r,h.signal).then(y=>{if(a.disposed||h.signal.aborted){y.dispose();return}le=y,E=new Qe(y.image),E.colorSpace=_e,E.needsUpdate=!0,l.source.value=E,L.map=E,L.needsUpdate=!0;const K=y.image.naturalWidth/y.image.naturalHeight;M.scale.set(.95*Math.min(1,K),.95*Math.min(1,1/K),1),l.imageHalfSize.value.set(M.scale.x/2,M.scale.y/2),k.scale.copy(M.scale),M.visible=!0,k.visible=!0,o.onImageStatus(""),R()}).catch(y=>{!a.disposed&&!h.signal.aborted&&o.onImageStatus(y instanceof Error?y.message:"原图加载失败")})},dispose(){a.dispose()}}}catch(d){throw a.dispose(),d}}const nt="_panel_16r7m_1",rt="_previewColumn_16r7m_58",at="_parameters_16r7m_59",st="_viewTabs_16r7m_72",lt="_viewport_16r7m_92",ct="_canvas_16r7m_104",dt="_lightHandle_16r7m_117",mt="_previewBadge_16r7m_159",ut="_unavailable_16r7m_172",ht="_imageStatus_16r7m_173",pt="_instructions_16r7m_192",gt="_disclaimer_16r7m_193",ft="_readonlyNote_16r7m_194",vt="_intensityNote_16r7m_195",wt="_previewActions_16r7m_206",xt="_sectionHeading_16r7m_225",yt="_presets_16r7m_243",_t="_control_16r7m_254",bt="_numericRow_16r7m_263",Mt="_numberBox_16r7m_278",Pt="_colorRow_16r7m_311",Ct="_hexLabel_16r7m_333",St="_error_16r7m_349",jt="_cinematicRow_16r7m_354",Lt="_resetLight_16r7m_392",c={panel:nt,previewColumn:rt,parameters:at,viewTabs:st,viewport:lt,canvas:ct,lightHandle:dt,previewBadge:mt,unavailable:ut,imageStatus:ht,instructions:pt,disclaimer:gt,readonlyNote:ft,intensityNote:vt,previewActions:wt,sectionHeading:xt,presets:yt,control:_t,numericRow:bt,numberBox:Mt,colorRow:Pt,hexLabel:Ct,error:St,cinematicRow:jt,switch:"_switch_16r7m_361",resetLight:Lt};function me({label:i,value:s,min:o,max:a,step:d,unit:p,disabled:w,onChange:f}){const m=v.useId(),u=l=>{if(w||!l.trim())return;const b=Number(l);Number.isFinite(b)&&f(Math.max(o,Math.min(a,b)))};return t.jsxs("div",{className:c.control,children:[t.jsx("label",{htmlFor:m,children:i}),t.jsxs("div",{className:c.numericRow,children:[t.jsx("input",{type:"range","aria-label":`${i}滑块`,min:o,max:a,step:d,value:s,disabled:w,onChange:l=>u(l.currentTarget.value)}),t.jsxs("span",{className:c.numberBox,children:[t.jsx("input",{id:m,type:"number","aria-label":i,min:o,max:a,step:d,value:s,disabled:w,onChange:l=>u(l.currentTarget.value)}),p&&t.jsx("span",{"aria-hidden":"true",children:p})]})]})]})}function Nt({value:i,disabled:s,onChange:o}){const a=v.useId(),[d,p]=v.useState(i),w=!/^#[0-9a-f]{6}$/i.test(d);return v.useEffect(()=>p(i),[i]),t.jsxs("div",{className:c.control,children:[t.jsx("label",{htmlFor:a,children:"灯光颜色"}),t.jsxs("div",{className:c.colorRow,children:[t.jsx("input",{type:"color","aria-label":"灯光颜色选择器",value:i,disabled:s,onChange:f=>{s||o(f.currentTarget.value)}}),t.jsx("span",{className:c.hexLabel,children:"HEX"}),t.jsx("input",{id:a,type:"text","aria-label":"灯光颜色 HEX","aria-invalid":w,"aria-describedby":w?`${a}-error`:void 0,value:d,disabled:s,spellCheck:!1,maxLength:7,onChange:f=>{if(s)return;const m=f.currentTarget.value;p(m),/^#[0-9a-f]{6}$/i.test(m)&&o(m.toLowerCase())},onBlur:()=>{w&&p(i)}})]}),w&&t.jsx("span",{id:`${a}-error`,className:c.error,children:"请输入 # 加 6 位十六进制颜色"})]})}function Bt({imageUrl:i,value:s,disabled:o,mediaFetch:a,onChange:d}){const p=v.useRef(null),w=v.useRef(null),f=v.useRef(null),m=v.useRef({value:s,disabled:o,onChange:d}),[u,l]=v.useState(!0),[b,V]=v.useState(""),[T,F]=v.useState("perspective"),[j,x]=v.useState(!1),[re,Q]=v.useState(null),P=J(o?s:re??s);v.useLayoutEffect(()=>{m.current={value:s,disabled:o,onChange:d},f.current?.update(J(s),o)},[s,o,d]),v.useEffect(()=>{const n=p.current,G=w.current;if(!n||!G)return;let L;try{L=ot(n,G,{onChange(M){m.current.disabled||m.current.onChange(J(M))},onPreview:Q,onImageStatus:V,onUnavailable:()=>l(!1),onViewChange:F})}catch{l(!1);return}return f.current=L,L.update(J(m.current.value),m.current.disabled),l(!0),()=>{f.current=null,L.dispose()}},[]),v.useEffect(()=>{f.current?.setImage(i,a)},[i,a]),v.useEffect(()=>{f.current?.setCompare(j)},[j]);const C=n=>{o||d(J({...P,...n}))},_=n=>{F(n),f.current?.setView(n)};return t.jsxs("section",{className:c.panel,"aria-label":"灯光设置",children:[t.jsxs("div",{className:c.previewColumn,children:[t.jsxs("div",{className:c.viewTabs,"data-readonly-view":"true","aria-label":"观察视角",children:[t.jsx("button",{type:"button","aria-pressed":T==="perspective",disabled:!u,onClick:()=>_("perspective"),children:"透视"}),t.jsx("button",{type:"button","aria-pressed":T==="front",disabled:!u,onClick:()=>_("front"),children:"正面"})]}),t.jsxs("div",{className:c.viewport,"data-readonly-view":"true","data-comparing":j,children:[t.jsx("canvas",{ref:p,className:c.canvas,"aria-label":"球面灯光控制器","data-testid":"lighting-viewport",hidden:!u,"data-readonly-view":"true"}),t.jsx("button",{ref:w,type:"button",className:c.lightHandle,"aria-label":"球面灯光点（可用角度输入调节）","data-testid":"lighting-handle",disabled:o||!u||j,hidden:!u,"data-readonly-view":"true"}),!u&&t.jsx("div",{className:c.unavailable,role:"status",children:"当前浏览器的 WebGL 3D 控制器不可用。请使用右侧方向、角度和颜色控件调整参数。"}),u&&b&&t.jsx("div",{className:c.imageStatus,role:"status",children:b}),u&&t.jsx("span",{className:c.previewBadge,children:j?"原图 · 按住对比":"光照示意"})]}),t.jsx("p",{className:c.instructions,children:"拖动灯光点调整方向；拖动球面空白仅旋转观察视角，不改变生成参数。"}),t.jsxs("div",{className:c.previewActions,"data-readonly-view":"true",children:[t.jsx("button",{type:"button",disabled:!u,onClick:()=>{F("perspective"),f.current?.resetView()},children:"重置视角"}),t.jsx("button",{type:"button",disabled:!i||!u,"aria-pressed":j,onPointerDown:n=>{n.button===0&&(n.currentTarget.setPointerCapture?.(n.pointerId),x(!0))},onPointerUp:()=>x(!1),onPointerCancel:()=>x(!1),onLostPointerCapture:()=>x(!1),onBlur:()=>x(!1),onKeyDown:n=>{(n.key===" "||n.key==="Enter")&&(n.preventDefault(),x(!0))},onKeyUp:n=>{(n.key===" "||n.key==="Enter")&&(n.preventDefault(),x(!1))},children:"按住对比原图"})]})]}),t.jsxs("div",{className:c.parameters,children:[t.jsxs("div",{className:c.sectionHeading,children:[t.jsx("h3",{children:"主光源"}),t.jsx("span",{children:"六向预设"})]}),t.jsx("div",{className:c.presets,children:tt.map(n=>t.jsx("button",{type:"button",disabled:o,"aria-pressed":P.light_azimuth===n.light_azimuth&&P.light_elevation===n.light_elevation,onClick:()=>C({light_azimuth:n.light_azimuth,light_elevation:n.light_elevation}),children:n.label},n.label))}),t.jsx(me,{label:"水平环绕角度",value:P.light_azimuth,min:-180,max:180,step:1,unit:"°",disabled:o,onChange:n=>C({light_azimuth:n})}),t.jsx(me,{label:"高度角",value:P.light_elevation,min:-90,max:90,step:1,unit:"°",disabled:o,onChange:n=>C({light_elevation:n})}),t.jsx(me,{label:"灯光强度",value:P.light_intensity,min:0,max:10,step:.05,unit:"",disabled:o,onChange:n=>C({light_intensity:n})}),t.jsx("p",{className:c.intensityNote,children:"0–<3 柔光 / 3–<7 明亮 / 7–10 强烈，0 不是关闭。"}),t.jsx(Nt,{value:P.light_color_hex,disabled:o,onChange:n=>C({light_color_hex:n})}),t.jsxs("div",{className:c.cinematicRow,children:[t.jsx("span",{children:"电影感"}),t.jsx("button",{type:"button",role:"switch","aria-label":"电影感","aria-checked":P.cinematic_mode,className:c.switch,disabled:o,onClick:()=>C({cinematic_mode:!P.cinematic_mode}),children:t.jsx("span",{})})]}),t.jsx("button",{type:"button",className:c.resetLight,disabled:o,onClick:()=>{o||d({...Se})},children:"重置灯光"}),o&&t.jsx("p",{className:c.readonlyNote,children:"只读：可观察和对比，不能修改灯光参数。"})]}),t.jsx("p",{className:c.disclaimer,children:"光束用于展示照射方向，图片仅做平面近似受光，不含真实场景深度、材质或遮挡阴影，也并非 AI 生成结果。拖动不会自动生成；请使用面板原有生成操作。"})]})}export{Bt as LightingPanel};
