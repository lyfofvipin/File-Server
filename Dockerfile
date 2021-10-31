FROM fedora:latest
MAINTAINER Vipin Kumar "kumarvipinyadav369@gmail.com"

RUN yum install -y python3-pip git

RUN git clone https://github.com/vipin3699/File-Server.git && \
    python3 -m pip install -r File-Server/requirements.txt && \
    mkdir -p /home/result_files/ && \
    chmod 777 /home/result_files/

WORKDIR File-Server
EXPOSE 5000

ENTRYPOINT [ "python3" ]
CMD ["run.py"]
