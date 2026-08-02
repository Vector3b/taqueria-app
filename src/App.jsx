import { useState, useEffect } from 'react';

const API_URL = 'https://script.google.com/macros/s/AKfycbziH_igDH8yL33JhUWP63Gi6-ob_PQlO3ObkaltkeV2w9IwjJj6la4NAEYDUFs6b8vYaA/exec';
const CLAVE_API = 'tq_9f3K7xR2mZ8pL4vN6qWs1';
const PRECIO_QUESO_EXTRA = 10;

export default function App() {
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem('autenticado') === 'true');
  const [usuarioActivo, setUsuarioActivo] = useState(() => sessionStorage.getItem('usuarioActivo') || '');
  const [rolActivo, setRolActivo] = useState(() => sessionStorage.getItem('rolActivo') || '');
  const [loginUsuario, setLoginUsuario] = useState('');
  const [loginClave, setLoginClave] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [verificando, setVerificando] = useState(false);

  const [adminOrdenes, setAdminOrdenes] = useState([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [cargandoAdmin, setCargandoAdmin] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyString());
  const [adminCerrado, setAdminCerrado] = useState(false);

  const [productos, setProductos] = useState([]);
  const [mesasActivas, setMesasActivas] = useState({});
  const [categoriaActiva, setCategoriaActiva] = useState('Mesa');
  const [carrito, setCarrito] = useState({});
  const [quesoExtra, setQuesoExtra] = useState({});
  const [notasProducto, setNotasProducto] = useState({});
  const [combos, setCombos] = useState([]);
  const [especiales, setEspeciales] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [ordenIdActivo, setOrdenIdActivo] = useState(null);
  const [comensales, setComensales] = useState([1]);
  const [comensalActivo, setComensalActivo] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [carnesSeleccionadas, setCarnesSeleccionadas] = useState([]);
  const [modalEspecialAbierto, setModalEspecialAbierto] = useState(false);
  const [tacoElegido, setTacoElegido] = useState(null);
  const [modalMesaOcupadaAbierto, setModalMesaOcupadaAbierto] = useState(false);
  const [mesaEnAccion, setMesaEnAccion] = useState(null);
  const [modalResumenAbierto, setModalResumenAbierto] = useState(false);

  function hoyString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  useEffect(() => {
    fetch(`${API_URL}?accion=productos&clave_api=${CLAVE_API}`)
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error('Error cargando productos:', err));
    cargarMesasActivas();
  }, []);

  useEffect(() => {
    if (autenticado && rolActivo === 'admin') {
      cargarResumenVentas(hoyString());
    }
  }, [autenticado, rolActivo]);

  function cargarMesasActivas() {
    fetch(`${API_URL}?accion=mesasActivas&clave_api=${CLAVE_API}`)
      .then(res => res.json())
      .then(data => setMesasActivas(data || {}))
      .catch(err => console.error('Error cargando mesas activas:', err));
  }

  function cargarResumenVentas(fecha) {
    const fechaConsulta = fecha || fechaSeleccionada;
    setCargandoAdmin(true);
    fetch(`${API_URL}?accion=resumenVentas&fecha=${fechaConsulta}&clave_api=${CLAVE_API}`)
      .then(res => res.json())
      .then(data => {
        setAdminOrdenes(data.ordenes || []);
        setAdminTotal(data.total || 0);
        setAdminCerrado(!!data.cerrado);
      })
      .catch(err => console.error('Error cargando resumen de ventas:', err))
      .finally(() => setCargandoAdmin(false));
  }

  async function cancelarOrdenAdmin(ordenId) {
    if (!window.confirm('¿Cancelar esta orden? No se sumará al total del día.')) return;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'cancelarOrden', orden_id: ordenId, clave_api: CLAVE_API })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      cargarResumenVentas(fechaSeleccionada);
    } catch (err) {
      alert('Error al cancelar la orden');
      console.error(err);
    }
  }

  async function cerrarDiaAdmin() {
    if (!window.confirm(`¿Cerrar el día ${fechaSeleccionada}? Ya no se podrán cancelar órdenes de ese día.`)) return;
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'cerrarDia', fecha: fechaSeleccionada, cerrado_por: usuarioActivo, clave_api: CLAVE_API })
      });
      cargarResumenVentas(fechaSeleccionada);
    } catch (err) {
      alert('Error al cerrar el día');
      console.error(err);
    }
  }

  async function iniciarSesion() {
    if (!loginUsuario.trim() || !loginClave) return;
    setVerificando(true);
    setErrorLogin('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'login', usuario: loginUsuario.trim(), clave: loginClave, clave_api: CLAVE_API })
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem('autenticado', 'true');
        sessionStorage.setItem('usuarioActivo', loginUsuario.trim());
        sessionStorage.setItem('rolActivo', data.rol);
        setUsuarioActivo(loginUsuario.trim());
        setRolActivo(data.rol);
        setAutenticado(true);
        setLoginClave('');
      } else {
        setErrorLogin('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setErrorLogin('Error de conexión, intenta de nuevo');
      console.error(err);
    } finally {
      setVerificando(false);
    }
  }

  function cerrarSesion() {
    sessionStorage.removeItem('autenticado');
    sessionStorage.removeItem('usuarioActivo');
    sessionStorage.removeItem('rolActivo');
    setAutenticado(false);
    setUsuarioActivo('');
    setRolActivo('');
  }

  const categoriasProductos = [...new Set(productos.map(p => p.categoria))];
  const tabs = ['Mesa', ...categoriasProductos];
  const esCombinado = nombre => nombre.toLowerCase().includes('combinad');
  const esElEspecial = nombre => nombre.toLowerCase() === 'el especial';

  const productosVisibles = productos.filter(
    p => p.categoria === categoriaActiva && !esCombinado(p.nombre) && !esElEspecial(p.nombre)
  );
  const productoCombinado = productos.find(p => p.categoria === categoriaActiva && esCombinado(p.nombre));
  const productoEspecial = productos.find(p => p.categoria === categoriaActiva && esElEspecial(p.nombre));
  const carnesDisponibles = productosVisibles;
  const tacosDisponibles = productos.filter(p => p.categoria === 'Tacos' && !esCombinado(p.nombre));

  function claveItem(productoId, comensal) {
    return productoId + '__' + comensal;
  }

  function elegirMesa(valor) {
    setMesa(valor);
    setOrdenIdActivo(null);
  }

  function tocarMesa(label) {
    const activa = mesasActivas[label];
    if (activa && mesa !== label) {
      setMesaEnAccion(label);
      setModalMesaOcupadaAbierto(true);
      return;
    }
    elegirMesa(label);
  }

  function continuarOrdenExistente(label) {
    const activa = mesasActivas[label];
    if (!activa) return;
    setMesa(label);
    setOrdenIdActivo(activa.ordenId);
    setModalMesaOcupadaAbierto(false);
    setCategoriaActiva(categoriasProductos[0] || 'Tacos');
  }

  async function imprimirYCerrarMesa(label) {
    const activa = mesasActivas[label];
    if (!activa) return;
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'cerrarMesa', orden_id: activa.ordenId, clave_api: CLAVE_API })
      });
      alert(`Cuenta de ${label}: $${activa.total}\n(La impresora térmica se conectará en el siguiente paso)`);
      setModalMesaOcupadaAbierto(false);
      cargarMesasActivas();
      if (mesa === label) {
        setMesa(null);
        setOrdenIdActivo(null);
      }
    } catch (err) {
      alert('Error al cerrar la mesa');
      console.error(err);
    }
  }

  function agregarNuevaOrden() {
    const siguiente = Math.max(...comensales) + 1;
    setComensales(prev => [...prev, siguiente]);
    setComensalActivo(siguiente);
  }

  function eliminarOrdenComensal(numero) {
    setCarrito(prev => {
      const nuevo = {};
      Object.entries(prev).forEach(([clave, cantidad]) => {
        if (!clave.endsWith('__' + numero)) nuevo[clave] = cantidad;
      });
      return nuevo;
    });
    setQuesoExtra(prev => {
      const nuevo = {};
      Object.entries(prev).forEach(([clave, val]) => {
        if (!String(clave).endsWith('__' + numero)) nuevo[clave] = val;
      });
      return nuevo;
    });
    setNotasProducto(prev => {
      const nuevo = {};
      Object.entries(prev).forEach(([clave, val]) => {
        if (!String(clave).endsWith('__' + numero)) nuevo[clave] = val;
      });
      return nuevo;
    });
    setCombos(prev => prev.filter(c => c.comensal !== numero));
    setEspeciales(prev => prev.filter(e => e.comensal !== numero));
    setComensales(prev => {
      const restantes = prev.filter(n => n !== numero);
      const final = restantes.length ? restantes : [1];
      if (comensalActivo === numero) setComensalActivo(final[0]);
      return final;
    });
  }

  function sumar(producto) {
    const clave = claveItem(producto.id, comensalActivo);
    setCarrito(prev => ({ ...prev, [clave]: (prev[clave] || 0) + 1 }));
  }

  function restarEnResumen(clave) {
    setCarrito(prev => {
      const cantidadActual = prev[clave] || 0;
      if (cantidadActual <= 1) {
        const nuevo = { ...prev };
        delete nuevo[clave];
        return nuevo;
      }
      return { ...prev, [clave]: cantidadActual - 1 };
    });
  }

  function sumarEnResumen(clave) {
    setCarrito(prev => ({ ...prev, [clave]: (prev[clave] || 0) + 1 }));
  }

  function quitarRegular(clave) {
    setCarrito(prev => {
      const nuevo = { ...prev };
      delete nuevo[clave];
      return nuevo;
    });
    setQuesoExtra(prev => {
      const nuevo = { ...prev };
      delete nuevo[clave];
      return nuevo;
    });
    setNotasProducto(prev => {
      const nuevo = { ...prev };
      delete nuevo[clave];
      return nuevo;
    });
  }

  function toggleQuesoExtra(clave) {
    setQuesoExtra(prev => ({ ...prev, [clave]: !prev[clave] }));
  }

  function toggleNota(clave, campo) {
    setNotasProducto(prev => ({
      ...prev,
      [clave]: {
        ...prev[clave],
        [campo]: !(prev[clave] && prev[clave][campo])
      }
    }));
  }

  function pedirNotaLibre(clave) {
    const actual = (notasProducto[clave] && notasProducto[clave].libre) || '';
    const texto = window.prompt('Nota para este producto:', actual);
    if (texto === null) return;
    setNotasProducto(prev => ({
      ...prev,
      [clave]: { ...prev[clave], libre: texto }
    }));
  }

  function construirNotas(clave, conQueso) {
    const n = notasProducto[clave] || {};
    const partes = [];
    if (n.sinCebolla) partes.push('sin cebolla');
    if (n.sinCilantro) partes.push('sin cilantro');
    if (n.cebollaAsada) partes.push('+ cebolla asada');
    if (conQueso) partes.push('queso extra');
    if (n.libre) partes.push(n.libre);
    return partes.join(', ');
  }

  function toggleCarneSeleccionada(nombreCarne) {
    setCarnesSeleccionadas(prev => {
      if (prev.includes(nombreCarne)) return prev.filter(c => c !== nombreCarne);
      if (prev.length >= 2) return prev;
      return [...prev, nombreCarne];
    });
  }

  function agregarCombinado() {
    if (carnesSeleccionadas.length !== 2) return;
    setCombos(prev => [...prev, {
      idLinea: Date.now(),
      producto: productoCombinado,
      carnes: [...carnesSeleccionadas],
      conQueso: !!quesoExtra['combo-' + productoCombinado.id + '__' + comensalActivo],
      comensal: comensalActivo
    }]);
    setCarnesSeleccionadas([]);
    setModalAbierto(false);
  }

  function quitarCombo(idLinea) {
    setCombos(prev => prev.filter(c => c.idLinea !== idLinea));
  }

  function agregarEspecial() {
    if (!tacoElegido) return;
    setEspeciales(prev => [...prev, {
      idLinea: Date.now(),
      producto: productoEspecial,
      taco: tacoElegido,
      comensal: comensalActivo
    }]);
    setTacoElegido(null);
    setModalEspecialAbierto(false);
  }

  function quitarEspecial(idLinea) {
    setEspeciales(prev => prev.filter(e => e.idLinea !== idLinea));
  }

  const itemsRegulares = Object.entries(carrito).map(([clave, cantidad]) => {
    const [productoId, comensalStr] = clave.split('__');
    const comensal = parseInt(comensalStr, 10);
    const producto = productos.find(p => p.id === productoId);
    const conQueso = producto.categoria === 'Tortas' && quesoExtra[clave];
    const precioUnitario = producto.precio + (conQueso ? PRECIO_QUESO_EXTRA : 0);
    return {
      clave, producto, comensal, cantidad, conQueso,
      subtotal: precioUnitario * cantidad,
      notas: construirNotas(clave, conQueso)
    };
  });

  const totalRegulares = itemsRegulares.reduce((acc, item) => acc + item.subtotal, 0);
  const totalCombos = combos.reduce((acc, c) => acc + c.producto.precio + (c.conQueso ? PRECIO_QUESO_EXTRA : 0), 0);
  const totalEspeciales = especiales.reduce((acc, e) => acc + e.producto.precio, 0);
  const total = totalRegulares + totalCombos + totalEspeciales;
  const cantidadTotal = itemsRegulares.reduce((acc, item) => acc + item.cantidad, 0) + combos.length + especiales.length;
  const ordenVacia = itemsRegulares.length === 0 && combos.length === 0 && especiales.length === 0;
  const faltaMesa = !mesa;

  function totalPorComensal(numero) {
    const r = itemsRegulares.filter(i => i.comensal === numero).reduce((acc, i) => acc + i.subtotal, 0);
    const c = combos.filter(c => c.comensal === numero).reduce((acc, c) => acc + c.producto.precio + (c.conQueso ? PRECIO_QUESO_EXTRA : 0), 0);
    const e = especiales.filter(e => e.comensal === numero).reduce((acc, e) => acc + e.producto.precio, 0);
    return r + c + e;
  }

  async function enviarOrden() {
    if (ordenVacia || faltaMesa) return;
    setEnviando(true);
    try {
      const todosLosItems = [
        ...itemsRegulares.map(i => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          conQueso: i.conQueso,
          notas: `Cliente ${i.comensal}` + (i.notas ? `: ${i.notas}` : '')
        })),
        ...combos.map(c => ({
          producto_id: c.producto.id,
          cantidad: 1,
          conQueso: c.conQueso,
          notas: `Cliente ${c.comensal}: ` + c.carnes.join(' + ') + (c.conQueso ? ' + queso extra' : '')
        })),
        ...especiales.map(e => ({
          producto_id: e.producto.id,
          cantidad: 1,
          conQueso: false,
          notas: `Cliente ${e.comensal}: taco de ${e.taco}`
        }))
      ];

      if (ordenIdActivo) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            accion: 'agregarProductos',
            orden_id: ordenIdActivo,
            items: todosLosItems,
            totalAgregado: total,
            clave_api: CLAVE_API
          })
        });
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            accion: 'crearOrden',
            mesa: mesa,
            mesero_id: usuarioActivo,
            total: total,
            items: todosLosItems,
            clave_api: CLAVE_API
          })
        });
      }

      setCarrito({});
      setCombos([]);
      setEspeciales([]);
      setQuesoExtra({});
      setNotasProducto({});
      setMesa(null);
      setOrdenIdActivo(null);
      setComensales([1]);
      setComensalActivo(1);
      setModalResumenAbierto(false);
      alert(ordenIdActivo ? 'Productos agregados a la cuenta' : 'Orden enviada correctamente');
      cargarMesasActivas();
    } catch (err) {
      alert('Error al enviar la orden');
      console.error(err);
    } finally {
      setEnviando(false);
    }
  }

  if (!autenticado) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: 'sans-serif' }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, textAlign: 'center' }}>Acceso</div>
        <input
          placeholder="Usuario"
          value={loginUsuario}
          onChange={e => setLoginUsuario(e.target.value)}
          style={{ width: '100%', padding: 10, fontSize: 15, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={loginClave}
          onChange={e => setLoginClave(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') iniciarSesion(); }}
          style={{ width: '100%', padding: 10, fontSize: 15, marginBottom: 10, boxSizing: 'border-box' }}
        />
        {errorLogin && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{errorLogin}</div>}
        <button
          onClick={iniciarSesion}
          disabled={verificando}
          style={{ width: '100%', padding: 12, fontSize: 15, background: '#2b7a3f', color: '#fff', border: 'none', borderRadius: 8, opacity: verificando ? 0.7 : 1 }}
        >
          {verificando ? 'Verificando...' : 'Entrar'}
        </button>
      </div>
    );
  }

  if (rolActivo === 'admin') {
    const esHoy = fechaSeleccionada === hoyString();
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#666' }}>Sesión: {usuarioActivo} (administrador)</span>
          <button onClick={cerrarSesion} style={{ fontSize: 12, border: 'none', background: 'none', color: '#c0392b' }}>Cerrar sesión</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: '#666' }}>Fecha:</label>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={e => { setFechaSeleccionada(e.target.value); cargarResumenVentas(e.target.value); }}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          />
          {!esHoy && (
            <button
              onClick={() => { setFechaSeleccionada(hoyString()); cargarResumenVentas(hoyString()); }}
              style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fafafa' }}
            >
              Hoy
            </button>
          )}
        </div>

        <div style={{ background: adminCerrado ? '#f1f1f1' : '#eaf5ec', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
            Total del {fechaSeleccionada} {adminCerrado && '· Día cerrado'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, color: adminCerrado ? '#666' : '#2b7a3f' }}>${adminTotal}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>No incluye órdenes canceladas</div>
        </div>

        {!adminCerrado && (
          <button
            onClick={cerrarDiaAdmin}
            style={{ width: '100%', padding: 12, marginBottom: 16, borderRadius: 8, border: 'none', background: '#b5651d', color: '#fff', fontSize: 14 }}
          >
            Cerrar el día {fechaSeleccionada}
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Órdenes de este día</div>
          <button
            onClick={() => cargarResumenVentas(fechaSeleccionada)}
            style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fafafa' }}
          >
            {cargandoAdmin ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {adminOrdenes.length === 0 && (
          <div style={{ fontSize: 14, color: '#999', padding: '12px 0' }}>No hay órdenes registradas este día.</div>
        )}

        {adminOrdenes.map(orden => {
          const cancelada = orden.estado === 'cancelada';
          return (
            <div
              key={orden.id}
              style={{
                border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8,
                background: cancelada ? '#fdf2f2' : '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, textDecoration: cancelada ? 'line-through' : 'none', color: cancelada ? '#999' : '#333' }}>
                  {orden.mesa} · ${orden.total}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Mesero: {orden.mesero_id} · Estado: {orden.estado}
                </div>
              </div>
              {!cancelada && !adminCerrado ? (
                <button
                  onClick={() => cancelarOrdenAdmin(orden.id)}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: 'none', background: '#c0392b', color: '#fff' }}
                >
                  Cancelar
                </button>
              ) : cancelada ? (
                <span style={{ fontSize: 12, color: '#c0392b' }}>Cancelada</span>
              ) : (
                <span style={{ fontSize: 12, color: '#999' }}>Día cerrado</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, paddingBottom: 90, fontFamily: 'sans-serif', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#666' }}>Sesión: {usuarioActivo}</span>
        <button onClick={cerrarSesion} style={{ fontSize: 12, border: 'none', background: 'none', color: '#c0392b' }}>Cerrar sesión</button>
      </div>

      <div style={{ fontSize: 13, marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: mesa ? '#eaf5ec' : '#fbe9d9', color: mesa ? '#2b7a3f' : '#b5651d' }}>
        {mesa
          ? (ordenIdActivo ? `Agregando productos a la cuenta activa de: ${mesa}` : `Tomando orden nueva para: ${mesa}`)
          : 'Selecciona una mesa antes de continuar'}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666', marginRight: 2 }}>Orden de:</span>
        {comensales.map(num => (
          <button
            key={num}
            onClick={() => setComensalActivo(num)}
            style={{
              padding: '6px 12px', fontSize: 13, borderRadius: 16,
              border: comensalActivo === num ? '2px solid #333' : '1px solid #ccc',
              background: comensalActivo === num ? '#333' : '#fafafa',
              color: comensalActivo === num ? '#fff' : '#333'
            }}
          >
            Cliente {num}
          </button>
        ))}
        <button
          onClick={agregarNuevaOrden}
          style={{ padding: '6px 12px', fontSize: 13, borderRadius: 16, border: '1px dashed #2b7a3f', background: '#fff', color: '#2b7a3f' }}
        >
          + Nueva orden
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              flexShrink: 0, padding: '10px 16px', fontSize: 15,
              background: cat === categoriaActiva ? '#333' : '#eee',
              color: cat === categoriaActiva ? '#fff' : '#333',
              border: 'none', borderRadius: 8, whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {categoriaActiva === 'Mesa' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(num => {
            const label = 'Mesa ' + num;
            const activa = mesasActivas[label];
            const esActual = mesa === label;
            return (
              <button
                key={num}
                onClick={() => tocarMesa(label)}
                style={{
                  padding: 14, fontSize: 15, borderRadius: 8,
                  border: esActual ? '2px solid #2b7a3f' : (activa ? '2px solid #1e5c2f' : '1px solid #ccc'),
                  background: esActual ? '#eaf5ec' : (activa ? '#2b7a3f' : '#fafafa'),
                  color: activa && !esActual ? '#fff' : '#333'
                }}
              >
                {num}
              </button>
            );
          })}
          {(() => {
            const label = 'Para llevar';
            const activa = mesasActivas[label];
            const esActual = mesa === label;
            return (
              <button
                onClick={() => tocarMesa(label)}
                style={{
                  gridColumn: 'span 5', padding: 12, fontSize: 15, borderRadius: 8, marginTop: 4,
                  border: esActual ? '2px solid #b5651d' : (activa ? '2px solid #1e5c2f' : '1px solid #ccc'),
                  background: esActual ? '#fbe9d9' : (activa ? '#2b7a3f' : '#fafafa'),
                  color: activa && !esActual ? '#fff' : '#333'
                }}
              >
                Para llevar
              </button>
            );
          })()}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {productosVisibles.map(producto => {
            const clave = claveItem(producto.id, comensalActivo);
            const cantidad = carrito[clave] || 0;
            const n = notasProducto[clave] || {};
            const esBebida = producto.categoria === 'Bebidas';
            return (
              <div
                key={producto.id}
                onClick={() => sumar(producto)}
                style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', position: 'relative' }}
              >
                {cantidad > 0 && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8, background: '#2b7a3f', color: '#fff',
                    borderRadius: '50%', width: 22, height: 22, fontSize: 12, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    {cantidad}
                  </div>
                )}
                <div style={{ fontWeight: 600 }}>{producto.nombre}</div>
                <div style={{ color: '#666', fontSize: 14 }}>${producto.precio}</div>

                {producto.categoria === 'Tortas' && cantidad > 0 && (
                  <label
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#666' }}
                  >
                    <input
                      type="checkbox"
                      checked={!!quesoExtra[clave]}
                      onChange={() => toggleQuesoExtra(clave)}
                    />
                    Extra queso (+${PRECIO_QUESO_EXTRA})
                  </label>
                )}

                {!esBebida && cantidad > 0 && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <button
                        onClick={() => toggleNota(clave, 'sinCebolla')}
                        style={{
                          fontSize: 11, padding: '6px 4px', borderRadius: 6,
                          border: n.sinCebolla ? '2px solid #b5651d' : '1px solid #ccc',
                          background: n.sinCebolla ? '#fbe9d9' : '#fafafa'
                        }}
                      >
                        Sin cebolla
                      </button>
                      <button
                        onClick={() => toggleNota(clave, 'sinCilantro')}
                        style={{
                          fontSize: 11, padding: '6px 4px', borderRadius: 6,
                          border: n.sinCilantro ? '2px solid #b5651d' : '1px solid #ccc',
                          background: n.sinCilantro ? '#fbe9d9' : '#fafafa'
                        }}
                      >
                        Sin cilantro
                      </button>
                    </div>
                    <button
                      onClick={() => toggleNota(clave, 'cebollaAsada')}
                      style={{
                        fontSize: 11, padding: '6px 4px', borderRadius: 6, width: '100%', marginTop: 4,
                        border: n.cebollaAsada ? '2px solid #b5651d' : '1px solid #ccc',
                        background: n.cebollaAsada ? '#fbe9d9' : '#fafafa'
                      }}
                    >
                      + Cebolla asada
                    </button>
                    <button
                      onClick={() => pedirNotaLibre(clave)}
                      title="Agregar nota escrita"
                      style={{
                        fontSize: 13, fontWeight: 600, padding: '4px 0', borderRadius: 6, width: '100%', marginTop: 4,
                        border: n.libre ? '2px solid #2b7a3f' : '1px dashed #999',
                        background: n.libre ? '#eaf5ec' : '#fff', color: n.libre ? '#2b7a3f' : '#666'
                      }}
                    >
                      {n.libre ? `✓ ${n.libre}` : '+ nota'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {productoCombinado && (
            <div
              onClick={() => setModalAbierto(true)}
              style={{ border: '2px dashed #2b7a3f', borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <div style={{ fontWeight: 600, color: '#2b7a3f' }}>{productoCombinado.nombre}</div>
              <div style={{ color: '#666', fontSize: 14 }}>${productoCombinado.precio} · elige 2 carnes</div>
            </div>
          )}

          {productoEspecial && (
            <div
              onClick={() => setModalEspecialAbierto(true)}
              style={{ border: '2px dashed #b5651d', borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <div style={{ fontWeight: 600, color: '#b5651d' }}>{productoEspecial.nombre}</div>
              <div style={{ color: '#666', fontSize: 14 }}>${productoEspecial.precio} · consomé + 1 taco</div>
            </div>
          )}
        </div>
      )}

      {!ordenVacia && (
        <div
          onClick={() => setModalResumenAbierto(true)}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, background: '#2b7a3f', color: '#fff',
            padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', boxShadow: '0 -2px 10px rgba(0,0,0,0.15)', zIndex: 500
          }}
        >
          <span style={{ fontSize: 15 }}>🛒 {cantidadTotal} producto{cantidadTotal !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>${total} · Ver orden ›</span>
        </div>
      )}

      {modalResumenAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: 20, maxWidth: 700, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 17 }}>Resumen de la orden {mesa ? `· ${mesa}` : ''}</div>
              <button onClick={() => setModalResumenAbierto(false)} style={{ border: 'none', background: 'none', fontSize: 20, color: '#666' }}>✕</button>
            </div>

            {ordenVacia && (
              <div style={{ fontSize: 14, color: '#999', padding: '8px 0' }}>Todavía no has agregado nada.</div>
            )}

            {comensales.map(numero => {
              const itemsDeEste = itemsRegulares.filter(i => i.comensal === numero);
              const combosDeEste = combos.filter(c => c.comensal === numero);
              const especialesDeEste = especiales.filter(e => e.comensal === numero);
              const vacioEste = itemsDeEste.length === 0 && combosDeEste.length === 0 && especialesDeEste.length === 0;
              if (vacioEste) return null;

              return (
                <div key={numero} style={{ marginBottom: 14, background: '#fafafa', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Cliente {numero} · ${totalPorComensal(numero)}</span>
                    <button onClick={() => eliminarOrdenComensal(numero)} style={{ border: 'none', background: 'none', color: '#c0392b', fontSize: 12 }}>Eliminar orden completa</button>
                  </div>

                  {itemsDeEste.map(item => (
                    <div key={item.clave} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                      <span>
                        {item.producto.nombre} · ${item.subtotal}
                        {item.notas && <div style={{ fontSize: 12, color: '#888' }}>{item.notas}</div>}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => restarEnResumen(item.clave)} style={{ width: 24, height: 24 }}>-</button>
                        <span>{item.cantidad}</span>
                        <button onClick={() => sumarEnResumen(item.clave)} style={{ width: 24, height: 24 }}>+</button>
                        <button onClick={() => quitarRegular(item.clave)} style={{ border: 'none', background: 'none', color: '#c0392b', marginLeft: 2, fontSize: 12 }}>Eliminar</button>
                      </div>
                    </div>
                  ))}

                  {combosDeEste.map(c => (
                    <div key={c.idLinea} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                      <span>{c.producto.nombre}: {c.carnes.join(' + ')}{c.conQueso ? ' + queso' : ''} · ${c.producto.precio + (c.conQueso ? PRECIO_QUESO_EXTRA : 0)}</span>
                      <button onClick={() => quitarCombo(c.idLinea)} style={{ border: 'none', background: 'none', color: '#c0392b', fontSize: 12 }}>Eliminar</button>
                    </div>
                  ))}

                  {especialesDeEste.map(e => (
                    <div key={e.idLinea} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                      <span>{e.producto.nombre}: consomé + taco de {e.taco} · ${e.producto.precio}</span>
                      <button onClick={() => quitarEspecial(e.idLinea)} style={{ border: 'none', background: 'none', color: '#c0392b', fontSize: 12 }}>Eliminar</button>
                    </div>
                  ))}
                </div>
              );
            })}

            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '2px solid #333', display: 'flex', justifyContent: 'space-between' }}>
              <span>{cantidadTotal} productos</span>
              <strong>${total}</strong>
            </div>

            {faltaMesa && !ordenVacia && (
              <div style={{ fontSize: 13, color: '#c0392b', marginTop: 8, textAlign: 'center' }}>
                Selecciona una mesa en la pestaña "Mesa" antes de enviar.
              </div>
            )}

            <button
              onClick={enviarOrden}
              disabled={enviando || ordenVacia || faltaMesa}
              style={{ width: '100%', marginTop: 12, padding: 14, fontSize: 16, background: '#2b7a3f', color: '#fff', border: 'none', borderRadius: 8, opacity: (ordenVacia || faltaMesa) ? 0.6 : 1 }}
            >
              {enviando ? 'Enviando...' : (ordenIdActivo ? 'Agregar a la cuenta' : 'Enviar orden')}
            </button>
          </div>
        </div>
      )}

      {modalMesaOcupadaAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 360, width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{mesaEnAccion} tiene una orden activa</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              Total actual: ${mesasActivas[mesaEnAccion]?.total || 0}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => continuarOrdenExistente(mesaEnAccion)}
                style={{ padding: 12, borderRadius: 8, border: 'none', background: '#2b7a3f', color: '#fff' }}
              >
                Agregar productos
              </button>
              <button
                onClick={() => imprimirYCerrarMesa(mesaEnAccion)}
                style={{ padding: 12, borderRadius: 8, border: 'none', background: '#b5651d', color: '#fff' }}
              >
                Imprimir cuenta
              </button>
              <button
                onClick={() => setModalMesaOcupadaAbierto(false)}
                style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 400, width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Elige 2 carnes para tu {productoCombinado?.nombre}</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              Para: Cliente {comensalActivo} · Seleccionadas: {carnesSeleccionadas.length}/2
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {carnesDisponibles.map(carne => {
                const seleccionada = carnesSeleccionadas.includes(carne.nombre);
                return (
                  <button
                    key={carne.id}
                    onClick={() => toggleCarneSeleccionada(carne.nombre)}
                    style={{
                      padding: 10, borderRadius: 8,
                      border: seleccionada ? '2px solid #2b7a3f' : '1px solid #ddd',
                      background: seleccionada ? '#eaf5ec' : '#fff'
                    }}
                  >
                    {carne.nombre}
                  </button>
                );
              })}
            </div>
            {categoriaActiva === 'Tortas' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={!!quesoExtra['combo-' + productoCombinado?.id + '__' + comensalActivo]}
                  onChange={() => toggleQuesoExtra('combo-' + productoCombinado?.id + '__' + comensalActivo)}
                />
                Extra queso (+${PRECIO_QUESO_EXTRA})
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => { setModalAbierto(false); setCarnesSeleccionadas([]); }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
              >
                Cancelar
              </button>
              <button
                onClick={agregarCombinado}
                disabled={carnesSeleccionadas.length !== 2}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#2b7a3f', color: '#fff' }}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEspecialAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 400, width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{productoEspecial?.nombre}</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              Para: Cliente {comensalActivo} · Incluye consomé regular. Elige tu taco:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {tacosDisponibles.map(taco => {
                const seleccionado = tacoElegido === taco.nombre;
                return (
                  <button
                    key={taco.id}
                    onClick={() => setTacoElegido(taco.nombre)}
                    style={{
                      padding: 10, borderRadius: 8,
                      border: seleccionado ? '2px solid #b5651d' : '1px solid #ddd',
                      background: seleccionado ? '#fbe9d9' : '#fff'
                    }}
                  >
                    {taco.nombre}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => { setModalEspecialAbierto(false); setTacoElegido(null); }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
              >
                Cancelar
              </button>
              <button
                onClick={agregarEspecial}
                disabled={!tacoElegido}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#b5651d', color: '#fff' }}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}