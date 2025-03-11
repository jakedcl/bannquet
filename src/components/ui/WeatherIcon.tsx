type WeatherIconProps = {
  type: 'snow' | 'mixed' | 'rain' | 'thunder' | 'overcast' | 'partlyCloudy' | 'foggy' | 'clear';
  className?: string;
};

export default function WeatherIcon({ type, className = '' }: WeatherIconProps) {
  const baseClass = 'text-[var(--brand-green)]';
  const combinedClass = `${baseClass} ${className}`;

  switch (type) {
    case 'snow':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3V21M12 3L8 7M12 3L16 7M12 21L8 17M12 21L16 17M3 12H21M3 12L7 8M3 12L7 16M21 12L17 8M21 12L17 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    case 'mixed':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12.5C20 16.9183 16.4183 20.5 12 20.5C7.58172 20.5 4 16.9183 4 12.5C4 8.08172 7.58172 4.5 12 4.5C16.4183 4.5 20 8.08172 20 12.5Z" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 13L10 15M14 9L16 11M10 9L8 11M16 13L14 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    case 'rain':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 19V21M8 13V15M12 17V19M12 11V13M16 19V21M16 13V15M20 15.2798C21.0344 14.4012 21.5 13.4678 21.5 12.5C21.5 10.0147 19.4853 8 17 8C16.6025 8 16.2157 8.04558 15.8451 8.13107C15.2741 5.21616 12.7416 3 9.5 3C5.91015 3 3 5.91015 3 9.5C3 10.4777 3.18582 11.4089 3.52734 12.2659C3.18555 12.6323 3 13.1344 3 13.7C3 15.2802 4.21979 16.5 5.8 16.5C6.37868 16.5 6.91594 16.3251 7.35277 16.0235" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    case 'thunder':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 3L6 13H12L11 21L18 11H12L13 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case 'overcast':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13.6C3 15.2569 4.34315 16.6 6 16.6H18C19.6569 16.6 21 15.2569 21 13.6C21 11.9432 19.6569 10.6 18 10.6H17.9389C17.9792 10.4109 18 10.2172 18 10.02C18 7.25044 15.7496 5 12.98 5C10.6675 5 8.70814 6.60762 8.18934 8.76V8.76C7.97147 8.71223 7.74373 8.6875 7.51039 8.6875C5.02094 8.6875 3 10.7084 3 13.198V13.6Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );

    case 'partlyCloudy':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 6.343L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M4 13.6C4 15.2569 5.34315 16.6 7 16.6H16C17.6569 16.6 19 15.2569 19 13.6C19 11.9432 17.6569 10.6 16 10.6H15.9389C15.9792 10.4109 16 10.2172 16 10.02C16 7.25044 13.7496 5 10.98 5C8.66748 5 6.70814 6.60762 6.18934 8.76V8.76C5.97147 8.71223 5.74373 8.6875 5.51039 8.6875C3.02094 8.6875 1 10.7084 1 13.198V13.6" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );

    case 'foggy':
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 16H21M3 12H21M3 8H21M9 20H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    case 'clear':
    default:
      return (
        <svg className={combinedClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 6.343L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
  }
} 