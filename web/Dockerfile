# Compila la SPA y la sirve con el Nginx que ya hace de proxy del backend.
FROM node:22-alpine AS build
WORKDIR /app

# Las dependencias se copian aparte para que la caché sobreviva a un cambio de código.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Configuración pública de Firebase para el push web (la pasa docker-compose desde el .env de la raíz).
# Vite las incorpora al paquete durante el build; no son secretos.
ARG VITE_FIREBASE_API_KEY=
ARG VITE_FIREBASE_AUTH_DOMAIN=
ARG VITE_FIREBASE_PROJECT_ID=
ARG VITE_FIREBASE_STORAGE_BUCKET=
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=
ARG VITE_FIREBASE_APP_ID=
ARG VITE_FIREBASE_VAPID_KEY=
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY     VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN     VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID     VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET     VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID     VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID     VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
# La configuración (proxy de /api, /graphql y /ws) llega montada desde infra/nginx.
EXPOSE 80
