import { Card, CardContent } from "@/components/ui/card";
import ContactSection from "../components/ContactSection";
import luxuryDoor from "@/assets/luxury-door.jpg";

const projects = [
  { id: 1, image: luxuryDoor, title: "Kitchen Cabinets" },
  { id: 2, image: luxuryDoor, title: "Wardrobe System" },
  { id: 3, image: luxuryDoor, title: "Office Storage" },
  { id: 4, image: luxuryDoor, title: "Custom Bookshelves" },
];

export default function CabinetFurniturePage() {
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">Cabinet Furniture</h1>
      <p className="text-lg text-gray-700 mb-10">
        Explore some of our completed cabinet furniture projects. Each piece is custom-made to fit the client’s space and lifestyle.
      </p>

      {/* Contact Form */}
      <div className="bg-muted rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-6">Start Your Project</h2>
        <p className="text-muted-foreground mb-6">
          Tell us what you have in mind and our manager will contact you shortly.
        </p>
        <ContactSection />
      </div>

      {/* Gallery */}
      <br />
      <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">
            Our Portfolio
          </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        
        {projects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden group cursor-pointer hover:shadow-xl transition"
          >
            <div className="relative">
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-64 object-cover transform group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-lg font-semibold transition">
                {project.title}
              </div>
            </div>
          </Card>
        ))}
      </div>

      
    </div>
  );
}
