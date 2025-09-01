FROM public.ecr.aws/lambda/nodejs:18

# Install required libs for Chromium
RUN yum install -y \
  atk \
  cups-libs \
  gtk3 \
  libXcomposite \
  libXcursor \
  libXdamage \
  libXext \
  libXi \
  libXrandr \
  libXScrnSaver \
  alsa-lib \
  ipa-gothic-fonts \
  xorg-x11-fonts-Type1 \
  xorg-x11-fonts-misc \
  nss

# Copy app files into container
COPY . .

# Install only prod dependencies
RUN npm install --omit=dev

# Lambda runtime entrypoint
CMD [ "index.handler" ]
