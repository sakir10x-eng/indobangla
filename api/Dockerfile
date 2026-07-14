FROM laravelsail/php81-composer
RUN apt-get update -y && \
    apt-get install -y libpng-dev libjpeg-dev libfreetype-dev zlib1g-dev libicu-dev g++ && \
    docker-php-ext-configure intl && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install exif gd intl zip pdo pdo_mysql
WORKDIR /app
COPY . .
RUN composer install && composer dump-autoload
