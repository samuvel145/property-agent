'use client';

interface PropertyCardProps {
  project: Record<string, unknown>;
}

export default function PropertyCard({ project }: PropertyCardProps) {
  const formatPrice = (price: unknown) => {
    if (!price || price === 'Price on request') return 'Price on request';
    if (typeof price === 'string' && price.includes('₹')) return price;
    if (typeof price === 'number') {
      if (price === 0) return 'Price on request';
      if (price > 10000000) {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
      }
      return `₹${(price / 100000).toFixed(1)} L`;
    }
    return 'Price on request';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready to Move':
        return 'bg-green-100 text-green-800';
      case 'Under Construction':
        return 'bg-amber-100 text-amber-800';
      case 'Pre-Launch':
        return 'bg-purple-100 text-purple-800';
      case 'Launched':
      case 'Available':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle both API format and simplified card format
  const title =
    (typeof project.title === 'string' && project.title) ||
    (typeof project.Project_Name_Original === 'string' && project.Project_Name_Original) ||
    (typeof project.Project_Name === 'string' && project.Project_Name) ||
    'Property';
  const developerList = Array.isArray(project.developer) ? project.developer : [];
  const firstDeveloper = (developerList[0] as Record<string, unknown> | undefined) ?? {};
  const developer =
    (typeof project.developer === 'string' && project.developer) ||
    (typeof firstDeveloper.Connection_Name === 'string' && firstDeveloper.Connection_Name) ||
    (typeof firstDeveloper.name === 'string' && firstDeveloper.name) ||
    (typeof project.Developer === 'string' && project.Developer) ||
    (typeof project.developer_name === 'string' && project.developer_name) ||
    'Premium Developer';
  const location =
    (typeof project.location === 'string' && project.location) ||
    [project.Location, project.City]
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .join(', ') ||
    'Prime Location';
  const configs = Array.isArray(project.configs) ? project.configs : [];
  const firstConfig = (configs[0] as Record<string, unknown> | undefined) ?? {};
  const price = project.price ?? firstConfig.FinalPrice ?? 0;
  const area =
    (typeof project.area === 'string' && project.area) ||
    (typeof firstConfig.Super_Built_Up_Area === 'string' && firstConfig.Super_Built_Up_Area) ||
    'Area on request';
  const status =
    (typeof project.status === 'string' && project.status) ||
    (typeof project.State_Of_Construction === 'string' && project.State_Of_Construction) ||
    'Available';
  const files = Array.isArray(project.files) ? project.files : [];
  const externalImageFile = files.find((f): f is Record<string, unknown> => {
    return typeof f === 'object' && f !== null && (f as Record<string, unknown>).Project_File_Type === 'EXT';
  });
  const imageUrl =
    (typeof project.image === 'string' && project.image) ||
    (typeof externalImageFile?.Project_File_Path === 'string' && externalImageFile.Project_File_Path) ||
    undefined;
  const type =
    (typeof project.type === 'string' && project.type) ||
    (typeof project.Project_Type === 'string' && project.Project_Type) ||
    'Apartment';

  return (
    <div className="w-60 bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex-shrink-0">
      {/* Image */}
      <div className="h-32 bg-gray-200 relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1" title={title}>
          {title}
        </h4>
        <p className="text-xs text-gray-600 mb-1">{developer}</p>
        <p className="text-xs text-gray-500 mb-3 line-clamp-1">
          {location}
        </p>

        <div className="space-y-2 border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Type:</span>
            <span className="text-xs font-medium text-gray-900">{type}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Area:</span>
            <span className="text-xs font-medium text-gray-900">{area}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Price:</span>
            <span className="text-xs font-bold text-blue-600">{formatPrice(price)}</span>
          </div>
        </div>

        <button className="w-full mt-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
}
