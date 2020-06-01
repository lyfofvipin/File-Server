FROM fedora:latest
MAINTAINER Vipin Kumar "kumarvipinyadav369@gmail.com"
RUN yum install -y python-pip git
ADD https://raw.githubusercontent.com/vipin3699/File-Server/master/install.sh .
EXPOSE 5000
ENTRYPOINT ["sh", "install.sh"]