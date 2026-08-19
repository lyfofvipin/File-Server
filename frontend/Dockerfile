FROM fedora:latest
MAINTAINER Kumar Vipin Yadav "kumarvipinyadav369@gmail.com"

RUN yum install -y python3-pip git

RUN git clone https://github.com/lyfofvipin/File-Server.git

WORKDIR File-Server/frontend
EXPOSE 5000

ENTRYPOINT [ "python3" ]
CMD ["serve.py"]
