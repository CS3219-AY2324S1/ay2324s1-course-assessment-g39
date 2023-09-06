FROM mongo:7.0.0

COPY replica.key /data/replica.key
RUN chmod 400 /data/replica.key
RUN chown 999:999 /data/replica.key

RUN mkdir -p /data/logs && chmod 777 -R /data/logs

RUN apt-get update && apt-get install netcat -y
COPY rs-initiate.sh /docker-entrypoint-initdb.d/rs-initiate.sh

