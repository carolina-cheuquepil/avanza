# Avanza

Aplicación web para crear objetivos personales y organizarlos por categoría,
prioridad y estado.

## Funcionalidades actuales

- registro con nombre, correo y contraseña;
- inicio y cierre de sesión;
- contraseñas protegidas con `scrypt`;
- sesiones persistentes mediante cookies `HttpOnly`;
- categorías creadas por cada usuario;
- creación, edición, activación y eliminación de objetivos;
- aislamiento de categorías y objetivos por `user_id`;
- filtros por categoría, prioridad y estado.

## Requisitos

- Node.js 22.13 o superior;
- MySQL 8;
- una base de datos y un usuario MySQL con permisos sobre `avanza`.

## Configuración de DigitalOcean

La aplicación utiliza exclusivamente un clúster MySQL administrado en
DigitalOcean. No contiene credenciales ni una configuración alternativa para
MySQL local.

Durante el desarrollo crea `.env.local`:

```bash
cp .env.example .env.local
```

En el servidor de producción crea `.env.production`:

```bash
cp .env.example .env.production
```

Copia desde **Connection details** del clúster de DigitalOcean:

- `MYSQL_HOST`: hostname público del clúster;
- `MYSQL_PORT`: puerto publicado por DigitalOcean (habitualmente `25060`);
- `MYSQL_USER` y `MYSQL_PASSWORD`: credenciales de la base de datos;
- `MYSQL_DATABASE`: base de datos de la aplicación;
- `MYSQL_SSL_CA_PATH`: ruta al certificado CA descargado del clúster.

La aplicación usa TLS únicamente cuando `MYSQL_SSL_CA_PATH` tiene un valor. La
ruta del certificado puede ser relativa al proyecto o absoluta. Si la variable
queda vacía, la conexión no envía la opción `ssl`; esto permite conectarse a
MySQL mediante un túnel SSH local.

> Next.js da prioridad a `.env.local` incluso en modo producción. No copies ese
> archivo al servidor o contenedor de producción; allí debe existir únicamente
> `.env.production` (o variables inyectadas por la plataforma).

## Instalación

1. Instala el esquema en el servidor correspondiente. Para DigitalOcean:

   ```bash
   mysql -h HOST -P PORT -u USER -p --ssl-mode=VERIFY_CA \
     --ssl-ca=RUTA_CA < sql/schema.mysql.sql
   ```

2. Instala y ejecuta:

   ```bash
   npm install
   npm run dev
   ```

## Producción

```bash
npm run build
npm start
```

La aplicación debe publicarse detrás de HTTPS para que la cookie de sesión se
marque como segura. No guardes `.env.local`, `.env.production`, certificados ni
credenciales en GitHub.

## Base de datos

La implementación usa directamente las tablas existentes:

- `users`
- `sessions`
- `categories`
- `tasks`

El archivo `sql/schema.mysql.sql` es idempotente: crea las tablas que falten sin
eliminar datos existentes.
