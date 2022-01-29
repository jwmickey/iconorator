FROM php:7.4-fpm

RUN apt-get update && apt-get install -y curl libcurl3-dev libicu-dev libmemcached-dev libxml2-dev libjpeg-dev \
    libpng-dev libfreetype6-dev libsodium-dev libxslt-dev libzip-dev libonig-dev openssl zip unzip
RUN pecl install redis apcu memcached pcov
RUN docker-php-ext-configure zip 
RUN docker-php-ext-install curl gd intl json mbstring opcache pdo_mysql session sodium xml xsl zip
RUN docker-php-ext-enable apcu curl gd intl mbstring memcached opcache pdo_mysql session redis xml xsl zip

RUN echo "extension=pcov.so" > $PHP_INI_DIR/conf.d/pcov.ini

RUN version=$(php -r "echo PHP_MAJOR_VERSION.PHP_MINOR_VERSION;") \
    && curl -A "Docker" -o /tmp/blackfire-probe.tar.gz -D - -L -s https://blackfire.io/api/v1/releases/probe/php/linux/amd64/$version \
    && mkdir -p /tmp/blackfire \
    && tar zxpf /tmp/blackfire-probe.tar.gz -C /tmp/blackfire \
    && mv /tmp/blackfire/blackfire-*.so $(php -r "echo ini_get ('extension_dir');")/blackfire.so \
    && printf "extension=blackfire.so\nblackfire.agent_socket=tcp://blackfire:8707\n" > $PHP_INI_DIR/conf.d/blackfire.ini \
    && rm -rf /tmp/blackfire /tmp/blackfire-probe.tar.gz

RUN echo "$(curl -sS https://composer.github.io/installer.sig) -" > composer-setup.php.sig \
        && curl -sS https://getcomposer.org/installer | tee composer-setup.php | sha384sum -c composer-setup.php.sig \
        && php composer-setup.php && rm composer-setup.php* \
        && chmod +x composer.phar && mv composer.phar /usr/bin/composer

COPY symfony.ini /usr/local/etc/php/conf.d
COPY symfony.ini /usr/local/etc/php/conf.d
COPY symfony.pool.conf /etc/php7/php-fpm.d/www.conf

RUN mkdir -p /var/wbl/cache && chmod 777 /var/wbl/cache
RUN mkdir -p /var/wbl/log && chmod 777 /var/wbl/log
RUN mkdir -p /var/www/uploads && chmod 777 /var/www/uploads

CMD ["php-fpm", "-F"]

WORKDIR /var/www/wbl

EXPOSE 9000
