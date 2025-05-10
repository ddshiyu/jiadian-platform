FROM node:18-alpine AS builder
# RUN npm install -g pnpm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --prod
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
EXPOSE 443
CMD ["npm", "start"]