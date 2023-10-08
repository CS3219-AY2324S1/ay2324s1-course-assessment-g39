FROM rabbitmq:3.11.23-management-alpine
COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
RUN echo $(ls)
RUN rabbitmq-plugins enable rabbitmq_web_stomp
RUN rabbitmq-server -detached