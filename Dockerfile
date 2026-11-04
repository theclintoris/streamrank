FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7100

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

EXPOSE 7100
CMD ["node", "src/server.js"]
