FROM node:22-bookworm-slim
WORKDIR /app/insect_expedition
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY shared ./shared
USER node
ENV NODE_ENV=production
CMD ["node", "server/index.cjs"]
