# This dockerfile can be used when you need to build mariadb with AWS encryption key management plugin installed
# and configured.  For general development, you can simply use the mariadb:10.4.13-bionic image from the docker library.
# Inspired/copied from https://github.com/creemama/docker/tree/master/mariadb-aws_key_management-plugin-build

FROM ubuntu:bionic

RUN printf "%s\n" "deb-src http://security.ubuntu.com/ubuntu/ bionic-security universe" \
    >> /etc/apt/sources.list \
    && apt-get -y update \
    && apt-get -y build-dep mariadb-server \
    && apt-get -y install git gnutls-dev libcurl3-dev libssl-dev uuid-dev \
    && cd /usr/local/src \
    && git clone --branch mariadb-10.4.13 --depth 1 https://github.com/MariaDB/server.git \
    && mkdir build-mariadb \
    && cd build-mariadb \
    && cmake \
      -DPLUGIN_AWS_KEY_MANAGEMENT=DYNAMIC \
      -DAWS_SDK_EXTERNAL_PROJECT=1 \
      -DNOT_FOR_DISTRIBUTION=1 \
      ../server

WORKDIR /usr/local/src/build-mariadb
RUN make aws_key_management

FROM mariadb:10.4.13-bionic
COPY \
  --from=0 \
  /usr/local/src/build-mariadb/plugin/aws_key_management/aws_key_management.so \
  /usr/lib/mysql/plugin/aws_key_management.so
COPY \
  --from=0 \
  /usr/local/src/server/debian/additions/enable_encryption.preset \
  /etc/mysql/conf.d/enable_encryption.preset
RUN usermod -d /var/lib/mysql/ mysql \
 && apt-get -y update \
 && apt-get -y install \
      libcurl4 \
      openssl \
      uuid
RUN printf "%s\n" "[mariadb]"                                             >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "!include /etc/mysql/conf.d/enable_encryption.preset"   >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "innodb_encrypt_log = ON"                               >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "innodb_encrypt_tables = OFF"                           >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "innodb_encryption_threads = 4"                         >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "ssl_ca = /run/secrets/mariadb-ca"                      >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "ssl_cert = /run/secrets/mariadb-server-cert"           >> /etc/mysql/conf.d/encryption.cnf \
 && printf "%s\n" "ssl_key = /run/secrets/mariadb-server-key"             >> /etc/mysql/conf.d/encryption.cnf

USER mysql

CMD mysqld \
  --encrypt-binlog=1 \
  --encrypt-tmp-files=1 \
  --plugin-load-add aws_key_management \
  --aws_key_management_key_spec=AES_256 \
  --aws_key_management_log_level=Warn \
  --aws_key_management_master_key_id=alias/wbl-mariadb \
  --aws_key_management_region=us-east-1 \
  --aws_key_management_rotate_key=-1
