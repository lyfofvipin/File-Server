FROM fedora:latest
MAINTAINER Kumar Vipin Yadav "kumarvipinyadav369@gmail.com"

RUN yum install -y python3-pip git

COPY . frontend

WORKDIR frontend
EXPOSE 8080

ENTRYPOINT [ "python3" ]
CMD ["serve.py"]
