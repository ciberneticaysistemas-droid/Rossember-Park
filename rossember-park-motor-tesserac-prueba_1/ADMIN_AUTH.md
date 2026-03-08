# Sistema de Autenticación y Rutas

## �️ Estructura de Rutas

El sistema ahora está organizado con rutas dedicadas para cada función:

### Rutas Públicas (Kiosco):
- **`/`** - Selector de dispositivos (Entrada, Salida, Búsqueda)
- **`/entrada`** - Estación de entrada de vehículos
- **`/salida`** - Estación de salida de vehículos
- **`/buscar`** - Buscador de parqueo y pagos

### Rutas Administrativas (Ocultas):
- **`/admin`** - Página de login del administrador (⚠️ NO visible en el selector)
- **`/admin/dashboard`** - Panel de administrador (requiere autenticación)

## 🔐 Acceso al Panel de Administrador

El panel de administrador está **completamente oculto** de la interfaz principal y solo se puede acceder mediante URL directa.

### Credenciales de Acceso:

```
Usuario: admin
Contraseña: admin123
```

⚠️ **IMPORTANTE**: Estas credenciales son de demostración. En producción, debes:
1. Cambiar las credenciales en `App.tsx` (buscar `ADMIN_CREDENTIALS`)
2. Implementar un backend seguro para la autenticación
3. Usar variables de entorno para las credenciales
4. Implementar hash de contraseñas (bcrypt, etc.)

## 🚀 Cómo Usar

### Para Usuarios del Kiosco:

**Opción 1: Desde el Selector**
1. Navega a `http://localhost:5173/` o tu dominio
2. Selecciona el tipo de estación:
   - **Estación de Entrada** → Redirige a `/entrada`
   - **Estación de Salida** → Redirige a `/salida`
   - **Buscador de Parqueo** → Redirige a `/buscar`

**Opción 2: Acceso Directo**
- Entrada: `http://tudominio.com/entrada`
- Salida: `http://tudominio.com/salida`
- Búsqueda: `http://tudominio.com/buscar`

### Para Administradores:

1. Navega **directamente** a `http://tudominio.com/admin`
   - ⚠️ Esta ruta NO aparece en el selector principal
   - Es completamente privada y oculta
2. Ingresa las credenciales:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. Serás redirigido automáticamente a `/admin/dashboard`
4. La sesión se mantiene mientras el navegador esté abierto

### Cerrar Sesión:
- Haz clic en el botón "Volver" en el panel de administrador
- O cierra la pestaña del navegador
- La sesión se borra automáticamente al cerrar el navegador

## 🔒 Seguridad

### Características de Seguridad Implementadas:

✅ **Rutas Protegidas**: El dashboard solo es accesible con autenticación  
✅ **Redirección Automática**: Si intentas acceder a `/admin/dashboard` sin login, te redirige a `/admin`  
✅ **Sesión Temporal**: Usa `sessionStorage` (se borra al cerrar el navegador)  
✅ **Panel Oculto**: No hay enlaces visibles al panel de admin en la interfaz pública  
✅ **Validación de Credenciales**: Verifica usuario y contraseña antes de permitir acceso  

### Mejoras Recomendadas para Producción:

1. **Backend de Autenticación**:
   ```javascript
   // Implementar API REST para login
   POST /api/auth/login
   {
     "username": "admin",
     "password": "hashed_password"
   }
   ```

2. **JWT Tokens**:
   - Usar tokens JWT para autenticación
   - Renovar tokens automáticamente
   - Implementar refresh tokens

3. **Variables de Entorno**:
   ```env
   VITE_ADMIN_USERNAME=admin
   VITE_ADMIN_PASSWORD_HASH=...
   ```

4. **Rate Limiting**:
   - Limitar intentos de login (ej. 5 intentos cada 15 minutos)
   - Bloquear IPs después de X intentos fallidos
   - Implementar CAPTCHA después de varios intentos

5. **HTTPS**:
   - Usar siempre HTTPS en producción
   - Implementar certificados SSL/TLS
   - Forzar redirección HTTP → HTTPS

6. **Logs de Auditoría**:
   - Registrar todos los intentos de login
   - Guardar acciones del administrador
   - Monitorear accesos sospechosos

## 📝 Cambiar Credenciales

Para cambiar las credenciales de administrador, edita el archivo `App.tsx`:

```typescript
// Busca esta sección (aproximadamente línea 50)
const ADMIN_CREDENTIALS = {
  username: 'tu_nuevo_usuario',
  password: 'tu_nueva_contraseña'
};
```

## 🛠️ Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

## 📱 Acceso desde Dispositivos

### Kiosco (Público):
- **Selector**: `http://tudominio.com/`
- **Entrada**: `http://tudominio.com/entrada`
- **Salida**: `http://tudominio.com/salida`
- **Búsqueda**: `http://tudominio.com/buscar`

### Admin (Privado):
- **Login**: `http://tudominio.com/admin` ⚠️ (Oculto)
- **Dashboard**: `http://tudominio.com/admin/dashboard` (Requiere login)

## 🎯 Configuración de Dispositivos Dedicados

Para configurar tablets o dispositivos dedicados:

### Dispositivo de Entrada:
1. Abre el navegador en modo kiosco
2. Navega a: `http://tudominio.com/entrada`
3. El dispositivo quedará fijo en la estación de entrada

### Dispositivo de Salida:
1. Abre el navegador en modo kiosco
2. Navega a: `http://tudominio.com/salida`
3. El dispositivo quedará fijo en la estación de salida

### Dispositivo de Búsqueda/Pagos:
1. Abre el navegador en modo kiosco
2. Navega a: `http://tudominio.com/buscar`
3. Los usuarios podrán buscar y pagar

### PC del Administrador:
1. Navega a: `http://tudominio.com/admin`
2. Inicia sesión con las credenciales
3. Accede al panel completo de administración

## 🔐 Seguridad Adicional

### Ocultar la Ruta Admin Completamente:

Si quieres mayor seguridad, puedes:

1. **Cambiar la ruta** a algo menos obvio:
   ```typescript
   // En App.tsx, cambia:
   <Route path="/admin" ...
   // Por:
   <Route path="/sistema-gestion-2025" ...
   ```

2. **Implementar autenticación de dos factores (2FA)**

3. **Restringir acceso por IP**:
   - Solo permitir acceso desde IPs específicas
   - Implementar whitelist de IPs

4. **Usar VPN**:
   - Requerir conexión VPN para acceder al panel admin

## 📞 Soporte

Para más información o soporte:
- Fundación Universidad de América
- Semillero IA 2025
- Equipo: Juan Andrés Rincón, Cristopher Ramirez, Alejandro Melo
