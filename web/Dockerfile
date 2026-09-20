# Compila la SPA y la sirve con el Nginx que ya hace de proxy del backend.
FROM node:22-alpine AS build
WORKDIR /app

# Las dependencias se copian aparte para que la caché sobreviva a un cambio de código.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
# La configuración (proxy de /api, /graphql y /ws) llega montada desde infra/nginx.
EXPOSE 80
