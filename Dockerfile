FROM alpine:latest
WORKDIR /home

RUN apk update && \
    apk upgrade && \
    apk add py3-pip

COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY . .
RUN mkdir /persistent
ENTRYPOINT ["/usr/bin/python3","app.py"]
