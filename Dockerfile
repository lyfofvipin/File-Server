FROM fedora:latest
MAINTAINER Vipin Kumar "kumarvipinyadav369@gmail.com"
RUN yum install -y python-pip git
EXPOSE 5000
ENTRYPOINT ["sh", "File-Server/install.sh"]