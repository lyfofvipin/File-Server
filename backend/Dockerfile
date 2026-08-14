FROM fedora:latest
MAINTAINER Kumar Vipin Yadav "kumarvipinyadav369@gmail.com"

RUN yum install -y python3-pip git

RUN git clone https://github.com/lyfofvipin/File-Server.git && \
    python3 -m pip install -r File-Server/backend/requirements.txt && \
    mkdir -p /home/dir_to_share/ && \
    chmod 777 /home/dir_to_share/

WORKDIR File-Server/backend
EXPOSE 5000

ENTRYPOINT [ "python3" ]
CMD ["run.py"]
