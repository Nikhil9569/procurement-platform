"use client";

import { useState } from"react";
import BrochureUpload, { ProductRow } from"./BrochureUpload";
import VendorLocation from"./VendorLocation";

export default function VendorDashboard() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [extractedProducts, setExtractedProducts] = useState<ProductRow[]>([]);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);

  const handleUploadSuccess = (products: ProductRow[], path: string, fileInfo: { name: string; size: string }) => {
    setExtractedProducts(products);
    setUploadedPath(path);
    setFileDetails(fileInfo);
    // Automatically advance to Step 2 (Location Selection)
    setCurrentStep(2);
  };

  const handleLocationSuccess = () => {
    // Automatically advance to Step 3 (Review & Publish)
    setCurrentStep(3);
  };

  const handlePublishSuccess = () => {
    // Reset or complete onboarding
    setCurrentStep(1);
    setExtractedProducts([]);
    setUploadedPath(null);
    setFileDetails(null);
  };

  const steps = [
    { id: 1, label:"Catalogue Upload", desc:"AI brochure parsing" },
    { id: 2, label:"Service Location", desc:"Geographic service area" },
    { id: 3, label:"Review & Publish", desc:"Verify extracted items" }
  ];

  return (
    <div className="w-full space-y-10 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl text-[#0F1E3C] tracking-tight">Onboarding & Inventory</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Complete your vendor profile to list products and match with buyers.</p>
      </div>

      {/* Modern Top Stepper */}
      <div className="bg-white border border-neutral-200/50 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;
            return (
              <div key={s.id} className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all border
                    ${isCompleted ?"bg-[#0F1E3C] text-white border-[#0F1E3C]" :""}
                    ${isActive ?"bg-white text-[#E8A838] border-[#E8A838] shadow-sm shadow-[#E8A838]/20" :""}
                    ${!isActive && !isCompleted ?"bg-neutral-50 text-neutral-400 border-neutral-200" :""}
`}>
                    {isCompleted ?"✓" : s.id}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isActive || isCompleted ?"text-[#0F1E3C]" :"text-neutral-400"}`}>
                      {s.label}
                    </h3>
                    <p className="text-[11px] text-[#6B7280]">{s.desc}</p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-px bg-neutral-200 mx-4" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stepper Content */}
      <div className="bg-white border border-neutral-200/50 rounded-2xl p-8 shadow-sm min-h-[400px]">
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <BrochureUpload 
              step={1} 
              onUploadComplete={handleUploadSuccess} 
              onPublishComplete={handlePublishSuccess} 
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-fade-in space-y-6">
            <VendorLocation onSaveComplete={handleLocationSuccess} />
            <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
              <button 
                onClick={() => setCurrentStep(1)} 
                className="text-xs font-semibold text-[#6B7280] hover:text-[#0F1E3C] transition-colors cursor-pointer"
              >
                &larr; Back to Catalog Upload
              </button>
              <button 
                onClick={() => setCurrentStep(3)} 
                className="text-xs font-semibold text-[#0F1E3C] hover:text-[#1A315C] transition-colors cursor-pointer"
              >
                Skip Location &rarr;
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="animate-fade-in">
            <BrochureUpload 
              step={3} 
              initialProducts={extractedProducts} 
              uploadedPath={uploadedPath}
              fileDetails={fileDetails}
              onUploadComplete={handleUploadSuccess}
              onPublishComplete={handlePublishSuccess} 
              onBack={() => setCurrentStep(2)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
