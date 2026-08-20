FROM fedora:latest
MAINTAINER Kumar Vipin Yadav "kumarvipinyadav369@gmail.com"

RUN yum install -y python3-pip git

COPY . backend
RUN python3 -m pip install -r backend/requirements.txt && \
    mkdir -p /home/dir_to_share/ && \
    chmod 777 /home/dir_to_share/

ENV FS_RESULT_BASE_DIR_PATH="/home/dir_to_share/"
WORKDIR backend
EXPOSE 5000

ENTRYPOINT [ "python3" ]
CMD ["run.py"]
