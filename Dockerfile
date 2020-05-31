FROM fedora:latest
RUN yum update -y && yum install -y python-pip git && git clone https://github.com/vipin3699/File-Server.git
RUN pip install -r File-Server/requirements.txt
EXPOSE 5000
ENTRYPOINT ["python3"]
CMD ["File-Server/run.py"]