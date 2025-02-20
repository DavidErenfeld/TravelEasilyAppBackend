
FROM node:18


ENV NODE_ENV=development


WORKDIR /app


COPY package*.json ./


RUN npm ci --omit=dev



COPY . .


EXPOSE 3000


CMD ["npm", "run", "dev"]
