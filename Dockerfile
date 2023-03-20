FROM node:19

WORKDIR /app

RUN npm install -g dynamodb-admin

COPY ["./", "./"]

CMD npm install && npm start
