<div className="bg-white rounded-lg shadow-sm p-4 mb-4">
  <div className="flex justify-between items-center mb-2">
    <h2 className="text-lg font-medium">{name}</h2>
    <div className="flex space-x-2">
      <button onClick={onEdit} className="text-gray-500 hover:text-gray-700">
        <PencilIcon className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="text-gray-500 hover:text-red-600">
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-blue-50 rounded p-2">
      <div className="text-sm text-blue-600">Accounts</div>
      <div className="text-2xl font-semibold">{accountCount}</div>
    </div>
    <div className="bg-purple-50 rounded p-2">
      <div className="text-sm text-purple-600">Methods</div>
      <div className="text-2xl font-semibold">{methodCount}</div>
    </div>
  </div>
</div> 