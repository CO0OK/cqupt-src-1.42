FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY . .
EXPOSE 4000
CMD ["node", "server.mjs"]
