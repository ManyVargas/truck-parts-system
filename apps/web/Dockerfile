FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN npm install --global npm@11.19.1

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/web apps/web
ARG VITE_ENABLE_DEMO_CONTROLS
ARG VITE_CAPABILITIES_PRESET
ENV VITE_ENABLE_DEMO_CONTROLS=$VITE_ENABLE_DEMO_CONTROLS
ENV VITE_CAPABILITIES_PRESET=$VITE_CAPABILITIES_PRESET
RUN npm run build --workspace @truck-parts/web

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

