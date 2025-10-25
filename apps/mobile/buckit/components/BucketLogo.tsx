import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface BucketLogoProps {
  size?: number;
  color?: string;
}

export default function BucketLogo({ size = 40, color = '#fff' }: BucketLogoProps) {
  return (
    <View style={{ width: size, height: size * 1.1 }}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 132 145" fill="none">
        <Path 
          d="M68.4092 0C79.4549 0 88.4092 8.95431 88.4092 20V125C88.4092 136.046 79.4549 145 68.4092 145H34.578C24.5948 145 16.1404 137.638 14.7679 127.75L0.19341 22.7497C-1.47554 10.726 7.86449 0 20.0035 0H68.4092Z" 
          fill={color}
        />
        <Path 
          d="M62.7224 0C51.6767 0 42.7224 8.95431 42.7224 20V125C42.7224 136.046 51.6767 145 62.7224 145H96.5536C106.537 145 114.991 137.638 116.364 127.75L130.938 22.7497C132.607 10.726 123.267 0 111.128 0H62.7224Z" 
          fill={color}
        />
      </Svg>
    </View>
  );
}
