FROM node:19

WORKDIR /app

RUN npm install -g npm

COPY ["./", "./"]

CMD npm install && npm start