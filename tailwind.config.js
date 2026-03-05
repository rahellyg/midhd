/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
		extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
			colors: {
				slate: {
					50: '#f7f5ef',
					100: '#efe9dc',
					200: '#dfd3be',
					300: '#c8b792',
					400: '#ad9567',
					500: '#8e774e',
					600: '#745f3e',
					700: '#5c4a31',
					800: '#443624',
					900: '#2f2519',
					950: '#1b140d'
				},
				indigo: {
					50: '#f2f8f2',
					100: '#e3f0e3',
					200: '#c6e2c8',
					300: '#9ecba3',
					400: '#72b77d',
					500: '#4f9a5f',
					600: '#3f7e4f',
					700: '#336641',
					800: '#2b5236',
					900: '#23422d',
					950: '#112318'
				},
				purple: {
					50: '#f4f7ee',
					100: '#e8efdc',
					200: '#d5e1bc',
					300: '#b9cc93',
					400: '#9bb267',
					500: '#80974b',
					600: '#667a3c',
					700: '#516030',
					800: '#3e4a26',
					900: '#2e371d',
					950: '#181f0f'
				},
				pink: {
					50: '#faf6ef',
					100: '#f3e9d9',
					200: '#e7d0b2',
					300: '#d6b082',
					400: '#c08d55',
					500: '#a96e38',
					600: '#8a562b',
					700: '#6d4222',
					800: '#52321d',
					900: '#3b2417',
					950: '#21130b'
				},
				rose: {
					50: '#faf6ef',
					100: '#f4eadb',
					200: '#e8d3b6',
					300: '#d7b38a',
					400: '#c1925f',
					500: '#ab7444',
					600: '#8a5a34',
					700: '#6d472a',
					800: '#523620',
					900: '#3a2617',
					950: '#20140c'
				},
				cyan: {
					50: '#f1f8f3',
					100: '#e0efe4',
					200: '#c2dfcb',
					300: '#99c8a9',
					400: '#6eae84',
					500: '#4f9367',
					600: '#3f7754',
					700: '#345f45',
					800: '#2b4b38',
					900: '#223b2d',
					950: '#112017'
				},
				sky: {
					50: '#f3f8f0',
					100: '#e6f0df',
					200: '#d0e2c2',
					300: '#b2cc9c',
					400: '#90b174',
					500: '#719656',
					600: '#5b7a45',
					700: '#496138',
					800: '#394c2d',
					900: '#2a3821',
					950: '#151f11'
				},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}